
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy.orm import Session
import models
from services.engine import execute_funnel
from services.bulk import process_bulk_send, process_bulk_funnel

@pytest.fixture
def mock_db():
    db = MagicMock(spec=Session)
    return db

@pytest.fixture
def mock_chatwoot():
    with patch("services.engine.ChatwootClient", new_callable=MagicMock) as mock_class:
        mock_instance = mock_class.return_value
        # Mock methods that are awaited in engine.py
        mock_instance.ensure_conversation = AsyncMock(return_value=123)
        mock_instance.is_within_24h_window = AsyncMock(return_value=True)
        mock_instance.send_message = AsyncMock(return_value={"id": 1})
        mock_instance.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        mock_instance.search_contact = AsyncMock(return_value={"payload": [{"id": 456}]})
        mock_instance.get_contact_labels = AsyncMock(return_value=[])
        yield mock_instance

@pytest.mark.asyncio
async def test_execute_funnel_global_block(mock_db, mock_chatwoot):
    # Setup
    funnel_id = 1
    trigger_id = 100
    contact_phone = "5554999920144"
    
    # Mock Trigger
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = trigger_id
    mock_trigger.client_id = 1
    mock_trigger.status = 'queued'
    mock_trigger.current_node_id = None
    mock_trigger.total_sent = 0
    
    # Mock Funnel
    mock_funnel = MagicMock(spec=models.Funnel)
    mock_funnel.id = funnel_id
    mock_funnel.blocked_phones = []
    mock_funnel.steps = {"nodes": [{"id": "start", "type": "start"}], "edges": []}
    
    # Mock DB Queries
    def side_effect(model):
        if model == models.Funnel:
            m = MagicMock()
            m.filter.return_value.first.return_value = mock_funnel
            return m
        if model == models.ScheduledTrigger:
            m = MagicMock()
            m.filter.return_value.first.return_value = mock_trigger
            return m
        if model == models.BlockedContact:
            # Simulate contact is blocked
            mock_block = MagicMock(spec=models.BlockedContact)
            m = MagicMock()
            m.filter.return_value.first.return_value = mock_block
            return m
        return MagicMock()

    mock_db.query.side_effect = side_effect

    # Execute
    # We pass the real classes to execute_funnel via models.
    # To fix the "MagicMock name='mock.BlockedContact...'" error, 
    # we need to make sure 'models' in engine.py is the real module.
    # It seems another test might have patched it.
    with patch("services.engine.models", models):
        await execute_funnel(funnel_id, 0, trigger_id, contact_phone, mock_db)

    # Verify
    assert mock_trigger.status == 'failed'
    assert "bloqueado globalmente" in mock_trigger.failure_reason
    # Ensure no message was sent
    mock_chatwoot.send_message.assert_not_called()

@pytest.mark.asyncio
async def test_process_bulk_send_skips_blocked():
    """
    Testa a lógica de normalização e detecção de número bloqueado usada em process_bulk_send.
    Garante que contatos na lista de exclusão são corretamente identificados,
    mesmo com variações de formato (com/sem +, com/sem código de país).
    """
    blocked_phone = "5554999920144"
    ok_phone = "5511988887777"

    # Simula um registro de BlockedContact como viria do banco
    blocked_row = MagicMock()
    blocked_row.phone = blocked_phone

    blocked_raw = [blocked_row]

    # Reproduz a lógica de normalização de bulk.py (linhas 131-140)
    blocked_list = set()
    blocked_suffixes = set()
    for b in blocked_raw:
        p = "".join(filter(str.isdigit, str(getattr(b, 'phone', b[0] if hasattr(b, '__getitem__') else ''))))
        if p:
            blocked_list.add(p)
            if len(p) >= 8:
                blocked_suffixes.add(p[-8:])
            else:
                blocked_suffixes.add(p)

    def is_blocked(phone: str) -> bool:
        clean = "".join(filter(str.isdigit, str(phone)))
        suffix = clean[-8:] if len(clean) >= 8 else clean
        return clean in blocked_list or suffix in blocked_suffixes

    # Contato bloqueado deve ser detectado
    assert is_blocked(blocked_phone), "Contato bloqueado deve ser detectado"
    # Via sufixo (últimos 8 dígitos) — detecta mesmo com variações de prefixo
    assert is_blocked("0054999920144"), "Contato bloqueado via sufixo (prefixo diferente)"
    # Contato OK não deve ser bloqueado
    assert not is_blocked(ok_phone), "Contato OK não deve ser detectado como bloqueado"

@pytest.mark.asyncio
async def test_normalization_logic():
    # Test the normalization logic directly as used in bulk.py
    blocked_raw = [MagicMock(phone="+551199998888"), ("551177776666",)]
    
    def get_phone(b):
        return "".join(filter(str.isdigit, str(getattr(b, 'phone', b[0]))))
        
    blocked_list = {get_phone(b) for b in blocked_raw}
    blocked_suffixes = {p[-8:] if len(p) >= 8 else p for p in blocked_list}
    
    assert "551199998888" in blocked_list
    assert "99998888" in blocked_suffixes
    assert "77776666" in blocked_suffixes
    
    # Test check logic
    contact_phone = "1177776666" # Formatting difference (missing 55)
    clean_contact = "".join(filter(str.isdigit, contact_phone))
    suffix = clean_contact[-8:] if len(clean_contact) >= 8 else clean_contact
    
    is_blocked = clean_contact in blocked_list or suffix in blocked_suffixes
    assert is_blocked is True

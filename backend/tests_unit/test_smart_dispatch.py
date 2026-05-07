import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from core.worker.handlers.funnel import handle_funnel_execution
import models
from datetime import datetime, timezone

@pytest.fixture
def mock_db():
    with patch("core.worker.handlers.funnel.SessionLocal") as mock_session_factory:
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session
        
        # Mocking query chain: db.query().filter().first()
        mock_query = mock_session.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.first.return_value = None # Fallback
        
        yield mock_session

@pytest.fixture
def mock_chatwoot():
    with patch("core.worker.handlers.funnel.ChatwootClient") as mock_client_class:
        mock_inst = AsyncMock()
        mock_client_class.return_value = mock_inst
        yield mock_inst

@pytest.mark.asyncio
async def test_smart_dispatch_free_message(mock_db, mock_chatwoot):
    """Testa se envia como mensagem livre quando a janela está aberta"""
    data = {
        "trigger_id": 1,
        "contact_phone": "5585999999999",
        "conversation_id": 1000
    }
    
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = 1
    mock_trigger.status = "pending"
    mock_trigger.client_id = 1
    mock_trigger.contact_phone = "5585999999999"
    mock_trigger.contact_name = "Teste"
    mock_trigger.template_name = "hello_world"
    mock_trigger.template_id = 123
    mock_trigger.template_language = "pt_BR"
    mock_trigger.template_components = []
    mock_trigger.template_body = "Hello"
    mock_trigger.private_note_template = ""
    mock_trigger.private_message = ""
    mock_trigger.funnel_id = None
    mock_trigger.meta = {}
    mock_trigger.execution_history = []
    mock_trigger.private_message_delay = 5
    mock_trigger.private_message_concurrency = 1
    
    # Mock queries
    mock_db.query.return_value.filter.return_value.first.side_effect = [mock_trigger, MagicMock(body="Hello {{1}}")]

    # Mock Window Manager
    with patch("services.window_manager.is_window_open_strict", new_callable=AsyncMock) as mock_win:
        mock_win.return_value = True
        
        # Mock send_text_direct
        mock_chatwoot.send_text_direct = AsyncMock(return_value={"messages": [{"id": "wamid.123"}]})
        
        # Mock wait_for_delivery_sync e upsert_webhook_lead
        with patch("core.worker.handlers.funnel.wait_for_delivery_sync", new_callable=AsyncMock) as mock_wait, \
             patch("core.worker.handlers.funnel.upsert_webhook_lead") as mock_upsert:
            mock_wait.return_value = ("completed", "delivered")
            mock_upsert.return_value = MagicMock()
            
            await handle_funnel_execution(data)
            
            # Verificações
            mock_chatwoot.send_text_direct.assert_called_once()
            assert mock_trigger.status == "completed"

@pytest.mark.asyncio
async def test_smart_dispatch_template_fallback(mock_db, mock_chatwoot):
    """Testa se faz fallback para template quando a janela está fechada"""
    data = {
        "trigger_id": 1,
        "contact_phone": "5585999999999",
        "conversation_id": 1000
    }
    
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = 1
    mock_trigger.status = "pending"
    mock_trigger.client_id = 1
    mock_trigger.contact_phone = "5585999999999"
    mock_trigger.contact_name = "Teste"
    mock_trigger.template_name = "hello_world"
    mock_trigger.template_id = 123
    mock_trigger.template_language = "pt_BR"
    mock_trigger.template_components = []
    mock_trigger.template_body = "Hello"
    mock_trigger.private_note_template = ""
    mock_trigger.private_message = ""
    mock_trigger.funnel_id = None
    mock_trigger.meta = {}
    mock_trigger.execution_history = []
    mock_trigger.private_message_delay = 5
    mock_trigger.private_message_concurrency = 1
    
    mock_db.query.return_value.filter.return_value.first.return_value = mock_trigger

    # Mock Window Manager
    with patch("services.window_manager.is_window_open_strict", new_callable=AsyncMock) as mock_win:
        mock_win.return_value = False
        
        # Mock send_template
        mock_chatwoot.send_template = AsyncMock(return_value={"messages": [{"id": "wamid.456"}]})
        
        # Mock wait_for_delivery_sync e upsert_webhook_lead
        with patch("core.worker.handlers.funnel.wait_for_delivery_sync", new_callable=AsyncMock) as mock_wait, \
             patch("core.worker.handlers.funnel.upsert_webhook_lead") as mock_upsert:
            mock_wait.return_value = ("completed", "delivered")
            mock_upsert.return_value = MagicMock()
            
            await handle_funnel_execution(data)
            
            # Verificações
            mock_chatwoot.send_template.assert_called_once()
            assert mock_trigger.status == "completed"

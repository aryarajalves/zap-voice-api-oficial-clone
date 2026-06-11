import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock
from core.engine.sync_utils import safe_chatwoot_sync
from models import ContactWindow

class MockResponse:
    def __init__(self, status_code, text="Not Found"):
        self.status_code = status_code
        self.text = text

@pytest.mark.asyncio
async def test_safe_chatwoot_sync_404_recovery():
    # 1. Setup Mocks
    db_mock = MagicMock()
    
    # Simula db.query(Model).filter(condicao).delete()
    query_mock = MagicMock()
    filter_mock = MagicMock()
    delete_mock = MagicMock()
    
    db_mock.query = query_mock
    query_mock.return_value = filter_mock
    filter_mock.filter.return_value = delete_mock
    delete_mock.delete = MagicMock(return_value=1)
    
    trigger_mock = MagicMock()
    trigger_mock.conversation_id = 999  # ID obsoleto/inválido
    trigger_mock.contact_name = "Arya Stark"
    trigger_mock.client_id = 1
    
    chatwoot_client_mock = AsyncMock()
    # ensure_conversation resolve para o ID correto 7544
    chatwoot_client_mock.ensure_conversation = AsyncMock(return_value={"conversation_id": 7544})
    
    # Função de sincronização que simula erro 404 na primeira vez e sucesso na segunda
    call_count = 0
    async def mock_sync_fn(c_id):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # Lança o erro 404
            request_mock = httpx.Request("POST", "http://chatwoot/conversations/999/messages")
            response_mock = httpx.Response(404, request=request_mock, text="Not Found")
            raise httpx.HTTPStatusError("404 Error", request=request_mock, response=response_mock)
        else:
            # Sucesso
            assert c_id == 7544
            
    # 2. Executar
    await safe_chatwoot_sync(
        db=db_mock,
        trigger=trigger_mock,
        contact_phone="5585996123586",
        client_id=1,
        effective_inbox_id=2,
        chatwoot_client=chatwoot_client_mock,
        sync_fn=mock_sync_fn
    )
    
    # 3. Asserts
    # Garante que a função de sincronização foi chamada duas vezes
    assert call_count == 2
    # Garante que tentou limpar a tabela ContactWindow no db
    query_mock.assert_called_with(ContactWindow)
    assert delete_mock.delete.call_count > 0
    # Garante que resolveu a nova conversa real
    chatwoot_client_mock.ensure_conversation.assert_called_once_with(
        "5585996123586", "Arya Stark", 2
    )
    # Garante que atualizou o Trigger localmente com o novo ID
    assert trigger_mock.conversation_id == 7544

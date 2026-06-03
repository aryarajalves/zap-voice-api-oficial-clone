import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.orm import Session
from chatwoot_client import ChatwootClient
from core.engine.nodes.actions import handle_label_node

@pytest.mark.anyio
async def test_handle_label_node_add_and_remove():
    """Testa se o handle_label_node adiciona e remove etiquetas corretamente do contato e conversa"""
    db_mock = MagicMock(spec=Session)
    trigger_mock = MagicMock()
    trigger_mock.client_id = 1
    
    # Nó com dados de adicionar etiquetas ('label') e remover etiquetas ('remove_label')
    node = {
        "id": "node-label-test",
        "type": "chatwoot_label",
        "data": {
            "label": "TagAdicionar1, TagAdicionar2",
            "remove_label": "TagRemover1, TagRemover2"
        }
    }
    
    chatwoot_mock = MagicMock(spec=ChatwootClient)
    chatwoot_mock.add_label_to_conversation = AsyncMock()
    chatwoot_mock.add_label_to_contact = AsyncMock()
    chatwoot_mock.remove_label_from_conversation = AsyncMock()
    chatwoot_mock.remove_label_from_contact = AsyncMock()
    
    # Mock para busca de contato retornar payload válido
    chatwoot_mock.search_contact = AsyncMock(return_value={
        "payload": [{"id": 12345}]
    })
    
    # Executar
    result = await handle_label_node(
        db=db_mock,
        trigger=trigger_mock,
        node=node,
        chatwoot=chatwoot_mock,
        contact_phone="5585999999999",
        conversation_id="9876"
    )
    
    assert result == "continue"
    
    # Verificações de Adicionar
    chatwoot_mock.add_label_to_conversation.assert_called_once_with("9876", "TagAdicionar1, TagAdicionar2")
    chatwoot_mock.add_label_to_contact.assert_called_once_with(12345, "TagAdicionar1, TagAdicionar2")
    
    # Verificações de Remover
    chatwoot_mock.remove_label_from_conversation.assert_called_once_with("9876", "TagRemover1, TagRemover2")
    chatwoot_mock.remove_label_from_contact.assert_called_once_with(12345, "TagRemover1, TagRemover2")

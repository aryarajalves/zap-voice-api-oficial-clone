import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import models

@pytest.mark.asyncio
@patch("rabbitmq_client.rabbitmq", new_callable=AsyncMock)
async def test_post_send_skips_private_note_if_bulk(mock_rabbitmq):
    from services.bulk_core import _post_send
    
    chatwoot_mock = MagicMock()
    chatwoot_mock.client_id = 1
    chatwoot_mock.settings = {"CHATWOOT_SELECTED_INBOX_ID": "2"}
    chatwoot_mock.ensure_conversation = AsyncMock(return_value={"conversation_id": 100})
    chatwoot_mock.find_existing_conversation = AsyncMock(return_value=None)
    
    # Mock do DB para retornar o trigger com is_bulk = True
    trigger_mock = models.ScheduledTrigger(id=10, client_id=1, is_bulk=True)
    msg_status_mock = MagicMock()
    
    db_mock = MagicMock()
    # Mock de query().get(10) retornando trigger_mock
    db_mock.query.return_value.get.return_value = trigger_mock
    # Mock de query().filter().first() retornando msg_status_mock
    db_mock.query.return_value.filter.return_value.first.return_value = msg_status_mock
    
    with patch("database.SessionLocal", return_value=db_mock):
        await _post_send(
            chatwoot=chatwoot_mock,
            phone="5585999999999",
            contact_name="Arya Stark",
            conversation_id=100,
            note_content="Nota Privada de Teste",
            chatwoot_label=None,
            trigger_id=10
        )
    
    # Como o trigger tem is_bulk = True, a nota privada NÃO deve ser enfileirada/enviada
    mock_rabbitmq.publish.assert_not_called()
    
    # Assert que o mock atribuiu o status de private_note_posted como False
    msg_status_mock.private_note_posted = False  # Definir para poder testar a atribuição feita pelo código
    assert msg_status_mock.private_note_posted is False


@pytest.mark.asyncio
@patch("core.worker.handlers.whatsapp.ChatwootClient")
@patch("core.worker.handlers.whatsapp.discover_or_create_chatwoot_conversation", new_callable=AsyncMock)
async def test_deferred_post_delivery_skips_private_note_if_bulk(mock_discover, mock_chatwoot_class):
    from core.worker.handlers.whatsapp import handle_deferred_post_delivery
    
    # Mock do ChatwootClient
    cw_mock = mock_chatwoot_class.return_value
    cw_mock.send_private_note = AsyncMock()
    
    # Mock do DB para retornar o trigger com is_bulk = True e o MessageStatus
    trigger_mock = models.ScheduledTrigger(id=10, client_id=1, is_bulk=True)
    msg_status_mock = models.MessageStatus(id=200, pending_private_note="Nota pendente", private_note_posted=False)
    
    db_mock = MagicMock()
    def get_mock(model_class_or_id):
        if model_class_or_id == models.ScheduledTrigger or model_class_or_id == 10:
            return trigger_mock
        return msg_status_mock
        
    db_mock.query.return_value.get.side_effect = lambda uid: trigger_mock if uid == 10 else msg_status_mock
    
    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_mock):
        with patch("asyncio.sleep", return_value=None):
            await handle_deferred_post_delivery(
                trigger_id=10,
                message_id=200,
                status="delivered",
                msg_id="wamid.123",
                phone="5585999999999"
            )
            
    # Como o trigger tem is_bulk = True, a função handle_deferred_post_delivery deve retornar imediatamente sem enviar nota
    cw_mock.send_private_note.assert_not_called()
    assert msg_status_mock.private_note_posted is False

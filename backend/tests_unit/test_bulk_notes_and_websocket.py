import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone
import models

# 1. Teste de Fallback do Inbox ID em ensure_conversation
@pytest.mark.asyncio
@patch("core.clients.chatwoot.contacts.ChatwootContactsMixin.search_contact", new_callable=AsyncMock)
@patch("core.clients.chatwoot.contacts.ChatwootContactsMixin.get_contact_conversations", new_callable=AsyncMock)
@patch("core.clients.chatwoot.contacts.ChatwootContactsMixin.is_within_24h_window", new_callable=AsyncMock)
async def test_ensure_conversation_inbox_id_fallback(mock_is_window, mock_get_convs, mock_search):
    from core.clients.chatwoot.client import ChatwootClient
    
    # Mock do Search Contact retornando contato inexistente para forçar criação
    mock_search.return_value = {"payload": []}
    
    client = ChatwootClient(client_id=1)
    client.settings = {"CHATWOOT_SELECTED_INBOX_ID": "2"}
    
    # Mock do create_contact
    client.create_contact = AsyncMock(return_value={"payload": {"contact": {"id": 999}}})
    client.create_conversation = AsyncMock(return_value={"id": 500})
    
    # Chama ensure_conversation omitindo inbox_id
    res = await client.ensure_conversation("5585999999999", "Arya Stark")
    
    # Garante que usou o fallback de inbox_id = 2 configurado nas settings para criar contato
    client.create_contact.assert_called_once_with("Arya Stark", "5585999999999", 2)
    assert res["conversation_id"] == 500


# 2. Teste do pós-envio do bulk enfileirando nota privada no RabbitMQ
@pytest.mark.asyncio
@patch("rabbitmq_client.rabbitmq", new_callable=AsyncMock)
async def test_post_send_enqueues_private_note(mock_rabbitmq):
    from services.bulk_core import _post_send
    
    chatwoot_mock = MagicMock()
    chatwoot_mock.client_id = 1
    chatwoot_mock.settings = {"CHATWOOT_SELECTED_INBOX_ID": "2"}
    chatwoot_mock.ensure_conversation = AsyncMock(return_value={"conversation_id": 100})
    
    # Mock do DB para o update de status
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    with patch("database.SessionLocal", return_value=db_mock):
        await _post_send(
            chatwoot=chatwoot_mock,
            phone="5585999999999",
            contact_name="Arya Stark",
            conversation_id=None,
            note_content="Nota Privada de Teste",
            chatwoot_label=None,
            trigger_id=10
        )
    
    # Verifica que chamou ensure_conversation passando o inbox_id correto
    chatwoot_mock.ensure_conversation.assert_called_once_with("5585999999999", "Arya Stark", inbox_id=2)
    
    # Verifica se publicou na fila chatwoot_private_messages
    mock_rabbitmq.publish.assert_called_once_with("chatwoot_private_messages", {
        "client_id": 1,
        "phone": "5585999999999",
        "message": "Nota Privada de Teste",
        "trigger_id": 10,
        "conversation_id": 100,
        "delay": 5
    })


# 3. Teste do envio de bulk_progress via WebSocket na entrega do WhatsApp
@pytest.mark.asyncio
@patch("core.worker.handlers.whatsapp.SessionLocal")
@patch("core.worker.handlers.whatsapp.rabbitmq", new_callable=AsyncMock)
async def test_whatsapp_delivery_emits_websocket_bulk_progress(mock_rabbitmq, mock_session_local):
    db_session = MagicMock()
    mock_session_local.return_value = db_session
    db_session.bind.dialect.name = 'sqlite'
    
    # Mock do trigger pai do bulk
    trigger_pai = models.ScheduledTrigger(
        id=30,
        client_id=1,
        contact_phone="5585999999999",
        is_bulk=True,
        template_name="welcome_template",
        status="processing",
        total_sent=10,
        total_delivered=2,
        total_read=1,
        total_contacts=10,
        total_failed=0,
        total_cost=0.70
    )
    
    # Mock da mensagem
    msg_status = models.MessageStatus(
        id=200,
        message_id="987654",
        trigger_id=30,
        status="sent",
        phone_number="5585999999999",
        delivered_counted=False
    )
    
    # Mocks do DB
    db_session.query.return_value.filter.return_value.first.return_value = msg_status
    db_session.query.return_value.get.return_value = trigger_pai
    
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "statuses": [{
                        "id": "wamid.987654",
                        "status": "delivered",
                        "recipient_id": "5585999999999",
                        "timestamp": "1600000000"
                    }]
                }
            }]
        }]
    }
    
    # Execute handle_whatsapp_event
    from core.worker.handlers.whatsapp import handle_whatsapp_event
    await handle_whatsapp_event(payload)
    
    # Garante que atualizou os dados no trigger e salvou
    db_session.commit.assert_called()
    
    # Garante que enviou o evento bulk_progress via RabbitMQ
    # Nota: No mock do banco de dados, o execute(text(UPDATE...)) não altera o objeto
    # python mockado em memória, portanto total_delivered permanece 2.
    mock_rabbitmq.publish_event.assert_called_with("bulk_progress", {
        "trigger_id": 30,
        "status": "processing",
        "sent": 10,
        "failed": 0,
        "total_contacts": 10,
        "delivered": 2, 
        "read": 1,
        "interactions": 0,
        "blocked": 0,
        "cost": 0.70
    })

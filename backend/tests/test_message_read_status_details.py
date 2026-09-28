import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from core.worker.handlers.whatsapp_status import handle_whatsapp_statuses

@pytest.mark.asyncio
async def test_handle_whatsapp_statuses_persists_read_at():
    mock_db = MagicMock()
    mock_db.bind = None

    # Simula MessageStatus não encontrado para focar no ChatMessage
    mock_db.query.return_value.filter.return_value.first.return_value = None

    # Simula ChatMessage encontrado
    mock_chat_msg = MagicMock()
    mock_chat_msg.id = 101
    mock_chat_msg.conversation_id = 42
    mock_chat_msg.wa_message_id = "wamid.HBgL123456789"
    mock_chat_msg.status = "delivered"
    mock_chat_msg.meta_data = {"status": "delivered"}
    mock_chat_msg.conversation = MagicMock(client_id=1)

    def query_mock(model):
        m = MagicMock()
        if hasattr(model, '__name__') and model.__name__ == 'ChatMessage':
            m.filter.return_value.first.return_value = mock_chat_msg
        else:
            m.filter.return_value.first.return_value = None
            m.get.return_value = None
        return m

    mock_db.query.side_effect = query_mock

    statuses = [{
        "id": "wamid.HBgL123456789",
        "status": "read",
        "timestamp": "1727546400",
        "recipient_id": "5585996123586"
    }]

    with patch("core.worker.handlers.whatsapp_status.wah.rabbitmq") as mock_rabbit:
        mock_rabbit.publish_event = AsyncMock()
        await handle_whatsapp_statuses(mock_db, statuses, value={})

        assert mock_chat_msg.status == "read"
        assert mock_chat_msg.meta_data["status"] == "read"
        assert "read_at" in mock_chat_msg.meta_data
        assert "delivered_at" in mock_chat_msg.meta_data

        mock_db.commit.assert_called()
        mock_rabbit.publish_event.assert_called()
        call_args = mock_rabbit.publish_event.call_args[0]
        event_name = call_args[0]
        payload = call_args[1]
        assert event_name == "message_status_updated"
        assert payload["status"] == "read"
        assert "read_at" in payload
        assert payload["message_id"] == 101

@pytest.mark.asyncio
async def test_handle_whatsapp_statuses_persists_delivered_at():
    mock_db = MagicMock()
    mock_db.bind = None

    mock_chat_msg = MagicMock()
    mock_chat_msg.id = 102
    mock_chat_msg.conversation_id = 55
    mock_chat_msg.wa_message_id = "wamid.HBgL987654321"
    mock_chat_msg.status = "sent"
    mock_chat_msg.meta_data = {"status": "sent"}
    mock_chat_msg.conversation = MagicMock(client_id=1)

    def query_mock(model):
        m = MagicMock()
        if hasattr(model, '__name__') and model.__name__ == 'ChatMessage':
            m.filter.return_value.first.return_value = mock_chat_msg
        else:
            m.filter.return_value.first.return_value = None
            m.get.return_value = None
        return m

    mock_db.query.side_effect = query_mock

    statuses = [{
        "id": "wamid.HBgL987654321",
        "status": "delivered",
        "timestamp": "1727546300",
        "recipient_id": "5585996123586"
    }]

    with patch("core.worker.handlers.whatsapp_status.wah.rabbitmq") as mock_rabbit:
        mock_rabbit.publish_event = AsyncMock()
        await handle_whatsapp_statuses(mock_db, statuses, value={})

        assert mock_chat_msg.status == "delivered"
        assert mock_chat_msg.meta_data["status"] == "delivered"
        assert "delivered_at" in mock_chat_msg.meta_data

        mock_db.commit.assert_called()
        mock_rabbit.publish_event.assert_called()
        call_args = mock_rabbit.publish_event.call_args[0]
        assert call_args[0] == "message_status_updated"
        assert call_args[1]["status"] == "delivered"
        assert "delivered_at" in call_args[1]


@pytest.mark.asyncio
async def test_list_messages_enriches_timestamps_from_message_status():
    from routers.chat.message_routes import list_messages
    from datetime import datetime, timezone

    mock_db = MagicMock()
    mock_user = MagicMock(id=1, client_id=1)
    
    convo = MagicMock(id=200, client_id=1, unread_count=2)
    
    sent_dt = datetime(2026, 9, 28, 10, 40, 30, tzinfo=timezone.utc)
    read_dt = datetime(2026, 9, 28, 10, 45, 12, tzinfo=timezone.utc)

    # Mensagem no ChatMessage sem read_at no meta_data
    chat_msg = MagicMock()
    chat_msg.id = 501
    chat_msg.conversation_id = 200
    chat_msg.sender_type = "user"
    chat_msg.user_id = 1
    chat_msg.message_type = "template"
    chat_msg.content = "Template Teste"
    chat_msg.media_url = None
    chat_msg.timestamp = sent_dt
    chat_msg.wa_message_id = "wamid.TEST_ENRICH_WAMID_123"
    chat_msg.status = "read"
    chat_msg.meta_data = {"is_template": True, "template_name": "PROMOCAO_BUSSOLA_02"}
    chat_msg.quoted_message_id = None
    chat_msg.is_starred = False

    # Registro no MessageStatus com read_at e sent_at
    msg_status = MagicMock()
    msg_status.message_id = "TEST_ENRICH_WAMID_123"
    msg_status.status = "read"
    msg_status.timestamp = sent_dt
    msg_status.updated_at = read_dt

    def query_mock(model):
        q = MagicMock()
        model_name = getattr(model, '__name__', str(model))
        if 'ChatConversation' in model_name:
            q.filter.return_value.first.return_value = convo
        elif 'ChatMessage' in model_name:
            q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [chat_msg]
            q.filter.return_value.order_by.return_value.all.return_value = [chat_msg]
        elif 'MessageStatus' in model_name:
            q.filter.return_value.all.return_value = [msg_status]
        return q

    mock_db.query.side_effect = query_mock

    result = await list_messages(
        conversation_id=200,
        account_id=None,
        limit=50,
        before_id=None,
        client_id=1,
        current_user=mock_user,
        db=mock_db
    )

    assert len(result) == 1
    msg_res = result[0]
    assert msg_res["id"] == 501
    assert msg_res["status"] == "read"
    assert msg_res["read_at"] == read_dt.isoformat()
    assert msg_res["delivered_at"] == read_dt.isoformat()
    assert msg_res["sent_at"] == sent_dt.isoformat()
    assert msg_res["meta_data"]["read_at"] == read_dt.isoformat()
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_handle_deferred_post_delivery_initializes_read_and_delivered_at():
    from core.worker.handlers.whatsapp_status import handle_deferred_post_delivery
    from datetime import datetime, timezone

    mock_db = MagicMock()
    sent_dt = datetime(2026, 9, 28, 10, 40, 30, tzinfo=timezone.utc)
    read_dt = datetime(2026, 9, 28, 10, 45, 12, tzinfo=timezone.utc)

    msg_record = MagicMock()
    msg_record.id = 99
    msg_record.message_type = "TEMPLATE"
    msg_record.template_name = "PROMOCAO_BUSSOLA_02"
    msg_record.status = "read"
    msg_record.content = "Conteúdo Promo"
    msg_record.var1 = "1"
    msg_record.var5 = None
    msg_record.contact_name = "Diego Anderle"
    msg_record.timestamp = sent_dt
    msg_record.updated_at = read_dt
    msg_record.pending_private_note = None

    trigger = MagicMock(id=10, client_id=1, contact_name="Diego Anderle", is_bulk=False, parent_id=None, chatwoot_label=None)

    convo = MagicMock(id=77, client_id=1, phone="5511999999999", labels=[])

    added_objects = []
    mock_db.add.side_effect = lambda obj: added_objects.append(obj)

    def query_mock(model):
        q = MagicMock()
        model_name = getattr(model, '__name__', str(model))
        if 'MessageStatus' in model_name:
            q.get.return_value = msg_record
        elif 'ScheduledTrigger' in model_name:
            q.get.return_value = trigger
        elif 'ChatMessage' in model_name:
            q.filter.return_value.first.return_value = None
        elif 'ChatConversation' in model_name:
            q.filter.return_value.first.return_value = convo
        elif 'WhatsAppTemplateCache' in model_name:
            q.filter.return_value.first.return_value = None
        return q

    mock_db.query.side_effect = query_mock

    with patch("core.worker.handlers.whatsapp_status.wah.SessionLocal", return_value=mock_db), \
         patch("core.worker.handlers.whatsapp_status.asyncio.sleep", new_callable=AsyncMock), \
         patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock) as mock_pub:
        await handle_deferred_post_delivery(
            trigger_id=10,
            message_id=99,
            status="read",
            msg_id="wamid.HBgLTEST999",
            phone="5511999999999"
        )

    # Verifica se ChatMessage foi adicionado com status e timestamps completos
    created_chat_msgs = [o for o in added_objects if getattr(o, '__tablename__', '') == 'chat_messages' or hasattr(o, 'wa_message_id')]
    assert len(created_chat_msgs) == 1
    new_msg = created_chat_msgs[0]
    assert new_msg.status == "read"
    assert new_msg.meta_data["status"] == "read"
    assert new_msg.meta_data["sent_at"] == sent_dt.isoformat()
    assert new_msg.meta_data["read_at"] == read_dt.isoformat()
    assert new_msg.meta_data["delivered_at"] == read_dt.isoformat()


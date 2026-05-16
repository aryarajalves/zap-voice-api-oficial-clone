import pytest
from sqlalchemy.orm import Session
import models
from worker import handle_whatsapp_event
from datetime import datetime, timezone
import uuid
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.mark.asyncio
@patch("services.ai_memory.notify_agent_memory_webhook", new_callable=AsyncMock)
async def test_bulk_message_delivery_triggers_memory_webhook(mock_notify, db_session):
    # Intercept PostgreSQL advisory locks for SQLite in test env
    orig_execute = db_session.execute
    def mock_execute(statement, params=None, *args, **kwargs):
        if "pg_advisory_xact_lock" in str(statement):
            return MagicMock()
        return orig_execute(statement, params, *args, **kwargs)
    db_session.execute = mock_execute

    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session):
        # 1. Create a bulk trigger and message
        trigger = models.ScheduledTrigger(
            client_id=1,
            template_name="Bulk_Test_Template",
            status="active",
            is_bulk=True,
            total_read=0,
            total_delivered=0
        )
        db_session.add(trigger)
        db_session.commit()
        db_session.refresh(trigger)

        msg_id = f"test_{uuid.uuid4()}"
        message = models.MessageStatus(
            trigger_id=trigger.id,
            message_id=msg_id,
            phone_number="5511999999999",
            status="sent",
            content="Olá, este é um envio em massa!"
        )
        db_session.add(message)
        db_session.commit()

        # 2. Simulate 'delivered' status update
        delivered_event = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": f"wamid.{msg_id}",
                            "status": "delivered",
                            "recipient_id": "5511999999999",
                            "timestamp": "1600000000"
                        }]
                    }
                }]
            }]
        }
        
        # We need to mock handle_deferred_post_delivery to avoid sleep
        with patch("core.worker.handlers.whatsapp.handle_deferred_post_delivery", return_value=asyncio.sleep(0)):
            await handle_whatsapp_event(delivered_event)
        
        db_session.commit()

        # 3. Verify that notify_agent_memory_webhook was called
        # wait a tiny bit since it is called via asyncio.create_task
        await asyncio.sleep(0.2)
        mock_notify.assert_called_once()
        args, kwargs = mock_notify.call_args
        
        assert kwargs["client_id"] == 1
        assert kwargs["phone"] == "5511999999999"
        assert kwargs["template_name"] == "Bulk_Test_Template"
        assert kwargs["content"] == "Olá, este é um envio em massa!"
        assert kwargs["trigger_id"] == trigger.id

@pytest.mark.asyncio
@patch("core.worker.handlers.whatsapp.asyncio.sleep", return_value=None)
@patch("core.worker.handlers.whatsapp.discover_or_create_chatwoot_conversation", new_callable=AsyncMock)
@patch("core.worker.handlers.whatsapp.ChatwootClient", new_callable=MagicMock)
async def test_deferred_post_delivery_sends_note(mock_cw_class, mock_discover, mock_sleep, db_session):
    from core.worker.handlers.whatsapp import handle_deferred_post_delivery

    # Mock ChatwootClient instance
    mock_cw_instance = MagicMock()
    mock_cw_instance.send_private_note = AsyncMock()
    mock_cw_class.return_value = mock_cw_instance

    mock_discover.return_value = {
        "conversation_id": 456,
        "contact_id": 789,
        "account_id": 1,
        "contact_name": "Joao Teste"
    }

    # Evita que o db.close() do handler encerre nossa sessão do teste
    orig_close = db_session.close
    db_session.close = MagicMock()

    try:
        with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db_session):
            # 1. Create trigger and message status with pending note
            trigger = models.ScheduledTrigger(
                client_id=1,
                template_name="Template_Teste",
                status="active",
                is_bulk=True
            )
            db_session.add(trigger)
            db_session.commit()
            db_session.refresh(trigger)

            msg_id = f"test_{uuid.uuid4()}"
            message = models.MessageStatus(
                trigger_id=trigger.id,
                message_id=msg_id,
                phone_number="5511999999999",
                status="sent",
                pending_private_note="Nota privada de teste enviada pelo bulk!",
                private_note_posted=False
            )
            db_session.add(message)
            db_session.commit()
            db_session.refresh(message)

            # 2. Call handle_deferred_post_delivery
            await handle_deferred_post_delivery(trigger.id, message.id, "delivered", msg_id, "5511999999999")

            db_session.refresh(message)

            # 3. Assertions
            mock_discover.assert_called_once_with(
                client_id=1,
                phone="5511999999999",
                name="5511999999999"
            )
            mock_cw_instance.send_private_note.assert_called_once_with(456, "Nota privada de teste enviada pelo bulk!")
            assert message.private_note_posted is True
            assert message.chatwoot_conversation_id == 456
    finally:
        db_session.close = orig_close

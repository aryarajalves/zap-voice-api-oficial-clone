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

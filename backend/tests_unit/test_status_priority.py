import pytest
from sqlalchemy.orm import Session
import models
from worker import handle_whatsapp_event
from datetime import datetime, timezone
import uuid
import asyncio
from unittest.mock import patch

@pytest.mark.asyncio
async def test_status_priority_delivered_after_read(db_session):
    with patch("worker.SessionLocal", return_value=db_session):
        # 1. Create a trigger and a message
        trigger = models.ScheduledTrigger(
            client_id=1,
            template_name="Test",
            status="active",
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
            status="sent"
        )
        db_session.add(message)
        db_session.commit()

        # 2. Simulate 'read' event
        read_event = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": f"wamid.{msg_id}",
                            "status": "read",
                            "recipient_id": "5511999999999",
                            "timestamp": "1600000000"
                        }]
                    }
                }]
            }]
        }
        
        # We need to mock notify_ai_memory to avoid external calls
        with patch("worker.notify_ai_memory", return_value=asyncio.sleep(0)):
            await handle_whatsapp_event(read_event)
        
        db_session.commit()
        
        # Query again to get updated state
        message = db_session.query(models.MessageStatus).filter_by(message_id=msg_id).first()
        trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()
        
        assert message.status == "read"
        assert trigger.total_read == 1

        # 3. Simulate 'delivered' event (LATE)
        delivered_event = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": f"wamid.{msg_id}",
                            "status": "delivered",
                            "recipient_id": "5511999999999",
                            "timestamp": "1600000001"
                        }]
                    }
                }]
            }]
        }
        await handle_whatsapp_event(delivered_event)
        
        db_session.commit()
        message = db_session.query(models.MessageStatus).filter_by(message_id=msg_id).first()
        trigger = db_session.query(models.ScheduledTrigger).filter_by(id=trigger.id).first()
        
        # CRITICAL: Status should REMAIN 'read'
        assert message.status == "read", "Status should not downgrade from read to delivered"
        assert trigger.total_read == 1
        assert trigger.total_delivered == 1

@pytest.mark.asyncio
async def test_status_priority_failed_overwrites_all(db_session):
    with patch("worker.SessionLocal", return_value=db_session):
        msg_id = f"test_{uuid.uuid4()}"
        trigger = models.ScheduledTrigger(client_id=1, template_name="Test", status="active")
        db_session.add(trigger)
        db_session.commit()
        
        message = models.MessageStatus(trigger_id=trigger.id, message_id=msg_id, status="read")
        db_session.add(message)
        db_session.commit()

        # Simulate 'failed' event
        failed_event = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": f"wamid.{msg_id}",
                            "status": "failed",
                            "recipient_id": "5511999999999",
                            "errors": [{"code": 131047, "title": "Rejection"}]
                        }]
                    }
                }]
            }]
        }
        await handle_whatsapp_event(failed_event)
        
        db_session.commit()
        message = db_session.query(models.MessageStatus).filter_by(message_id=msg_id).first()
        assert message.status == "failed"

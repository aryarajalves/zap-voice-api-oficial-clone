
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

# Add parent dir to path to import modules
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

# FORCE ENV VAR FOR TEST
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/zapvoice"

from database import SessionLocal
import models
from worker import handle_whatsapp_event

async def test_button_interaction():
    db = SessionLocal()
    
    # 1. Setup: Create a Trigger, Funnel, and MessageStatus
    # Check if we have a client_id=1
    client_id = 1
    
    # Create Test Funnel that SHOULD be triggered
    funnel_name = f"Test Funnel {uuid.uuid4().hex[:6]}"
    keyword = "sim"
    
    funnel = models.Funnel(
        client_id=client_id,
        name=funnel_name,
        trigger_phrase=keyword,
        steps=[{"type": "message", "content": "Funnel Triggered!"}]
    )
    db.add(funnel)
    db.commit()
    db.refresh(funnel)
    print(f"✅ Created Funnel {funnel.id} with trigger '{keyword}'")

    # Create Original Trigger (that sent the button)
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        status="completed",
        scheduled_time=datetime.now(timezone.utc),
        is_bulk=False,
        contact_phone="558599999999"
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)
    print(f"✅ Created Original Trigger {trigger.id}")

    # Create MessageStatus (the message that had the button)
    msg_id = f"wamid.{uuid.uuid4().hex}"
    msg_status = models.MessageStatus(
        trigger_id=trigger.id,
        message_id=msg_id,
        phone_number="558599999999",
        status="delivered"
    )
    db.add(msg_status)
    db.commit()
    print(f"✅ Created MessageStatus {msg_id}")

    # 2. Simulate Webhook Payload (Button Reply)
    webhook_payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "558599999999",
                                    "id": f"wamid.resp.{uuid.uuid4().hex}",
                                    "type": "button",
                                    "button": {
                                        "text": "Sim", # Matches keyword (case insensitive)
                                        "payload": "SIM_PAYLOAD"
                                    },
                                    "context": {
                                        "id": msg_id # References original message
                                    },
                                    "timestamp": "1700000000"
                                }
                            ],
                            "contacts": [{"profile": {"name": "Test User"}}]
                        }
                    }
                ]
            }
        ]
    }

    print("\n🏁 Executing handle_whatsapp_event...")
    await handle_whatsapp_event(webhook_payload)
    
    # 3. Verify Result
    # Check if a new trigger was created for the funnel
    new_trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.funnel_id == funnel.id,
        models.ScheduledTrigger.contact_phone == "558599999999",
        models.ScheduledTrigger.template_name == "HIDDEN_CHILD"
    ).first()

    if new_trigger:
        print(f"\n🎉 SUCCESS! Funnel Trigger Created: ID {new_trigger.id}")
    else:
        print(f"\n❌ FAILED! No new trigger found for funnel {funnel.id}")
        
    db.close()

if __name__ == "__main__":
    asyncio.run(test_button_interaction())

import sys
import os
sys.path.append(os.getcwd())
from database import SessionLocal
import models
import json

db = SessionLocal()
triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.id.desc()).limit(5).all()

for trigger in triggers:
    print(f"--- Trigger ID: {trigger.id} ---")
    print(f"Status: {trigger.status}")
    print(f"Total Sent: {trigger.total_sent}")
    print(f"Total Failed: {trigger.total_failed}")
    print(f"Failure Reason: {trigger.failure_reason}")
    print(f"Client ID: {trigger.client_id}")
    
    # Check individual messages for this trigger
    messages = db.query(models.MessageStatus).filter_by(trigger_id=trigger.id).all()
    print(f"Messages recorded: {len(messages)}")
    for msg in messages:
        print(f"  - Phone: {msg.phone_number} | Status: {msg.status} | Reason: {msg.failure_reason}")

db.close()

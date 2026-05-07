from database import SessionLocal
import models
import json

db = SessionLocal()
triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.id.desc()).limit(10).all()
for trigger in triggers:
    print(f"ID: {trigger.id} | Status: {trigger.status} | Phone: {trigger.contact_phone} | Funnel: {trigger.funnel_id}")
    if trigger.status == 'failed':
        print(f"  Failure Reason: {trigger.failure_reason}")
db.close()

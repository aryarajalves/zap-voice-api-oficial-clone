import sys
import os
sys.path.append(os.getcwd())
from database import SessionLocal
import models

db = SessionLocal()
triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.id.desc()).limit(10).all()

for trigger in triggers:
    print(f"ID: {trigger.id} | Status: {trigger.status} | Total: {trigger.total_contacts} | Sent: {trigger.total_sent} | Created: {trigger.created_at}")

db.close()

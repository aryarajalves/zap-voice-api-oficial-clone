import sys
sys.path.append(".")
from database import SessionLocal
import models
import json

db = SessionLocal()
t = db.query(models.ScheduledTrigger).filter_by(id=1250).first()
if t:
    print("Contacts List:", t.contacts_list)
    print("Processed Contacts:", t.processed_contacts)
    print("Template Name:", t.template_name)
    # Print the logs/events/message status
    statuses = db.query(models.MessageStatus).filter_by(trigger_id=t.id).all()
    for s in statuses:
        print(f"Status - Phone: {s.phone_number}, Type: {s.message_type}, Status: {s.status}, Detail: {s.failure_reason}, Content: {s.content}")
else:
    print("Trigger not found")
db.close()

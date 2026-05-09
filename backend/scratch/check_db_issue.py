import os
from dotenv import load_dotenv
load_dotenv()

import models
from database import SessionLocal
from datetime import datetime, timezone

db = SessionLocal()
phone = "5585996123586"
clean_phone = "".join(filter(str.isdigit, phone))

print(f"--- Checking Window for {clean_phone} ---")
window = db.query(models.ContactWindow).filter(models.ContactWindow.phone == clean_phone).all()
if not window:
    print("No window in cache!")
for w in window:
    print(f"ID: {w.id} | Phone: {w.phone} | Inbox: {w.chatwoot_inbox_id} | Last: {w.last_interaction_at} | Convo: {w.chatwoot_conversation_id}")

print("\n--- Checking Last Trigger for this phone ---")
trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.contact_phone == phone).order_by(models.ScheduledTrigger.id.desc()).first()
if trigger:
    print(f"ID: {trigger.id} | Status: {trigger.status} | Sent As: {trigger.sent_as} | Meta Category: {trigger.meta_price_category}")
else:
    print("No trigger found.")

db.close()

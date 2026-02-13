from sqlalchemy.orm import Session
from database import SessionLocal
import models
import json

db = SessionLocal()
# Get the very last event
event = db.query(models.WebhookEvent).order_by(models.WebhookEvent.id.desc()).first()

if event:
    print(f"--- FULL PAYLOAD FOR EVENT ID {event.id} ---")
    print(json.dumps(event.payload, indent=2))
    print(f"\nStatus: {event.status}")
    print(f"Error: {event.error_message}")
else:
    print("No events found.")
db.close()

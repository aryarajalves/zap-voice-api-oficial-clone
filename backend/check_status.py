import os
import sys

# Override DATABASE_URL for host access if needed BEFORE importing application modules
db_url = os.getenv("DATABASE_URL")
if not db_url:
    # Try to load from .env manually if not set
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    except: pass

if db_url and "zapvoice-postgres" in db_url:
    os.environ["DATABASE_URL"] = db_url.replace("zapvoice-postgres", "localhost")

# Now import application modules
sys.path.append(os.getcwd())
from database import SessionLocal
import models
from datetime import datetime, timezone

def check_recent_messages():
    db = SessionLocal()
    try:
        print("--- ÚLTIMOS DISPAROS (ScheduledTrigger) ---")
        triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.id.desc()).limit(10).all()
        for t in triggers:
            print(f"ID: {t.id} | Status: {t.status} | Phone: {t.contact_phone} | Template: {t.template_name} | Failed: {t.total_failed} | Failure Reason: {t.failure_reason}")
            
            # Check message statuses for this trigger
            msg_statuses = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == t.id).all()
            for ms in msg_statuses:
                print(f"  -> MsgID: {ms.message_id} | Status: {ms.status} | Error: {ms.failure_reason}")
        
        print("\n--- ÚLTIMOS ERROS DE WEBHOOK (WebhookHistory) ---")
        history = db.query(models.WebhookHistory).order_by(models.WebhookHistory.id.desc()).limit(10).all()
        for h in history:
            print(f"ID: {h.id} | Integration: {h.integration_id} | Event: {h.event_type} | Status: {h.status} | Error: {h.error_message}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_messages()

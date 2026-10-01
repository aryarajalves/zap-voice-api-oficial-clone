
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Path adjust
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load .env
dotenv_path = os.path.join(os.getcwd(), 'backend', '.env')
load_dotenv(dotenv_path)

# Correct DATABASE_URL for local execution if running outside docker
db_url = os.getenv("DATABASE_URL")
if db_url and "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost")
os.environ["DATABASE_URL"] = db_url

try:
    from database import SessionLocal
    import models
    db = SessionLocal()
except Exception as e:
    print(f"Error connecting to DB: {e}")
    sys.exit(1)

def debug_trigger():
    phone_number = "558596123586"
    funnel_name = "Novo Funil 25/01/2026"
    
    funnel = db.query(models.Funnel).filter(models.Funnel.name == funnel_name).first()
    if not funnel:
        print(f"Funnel '{funnel_name}' not found.")
        return
    
    print(f"Funnel: {funnel.name} (ID {funnel.id})")
    
    since = datetime.now() - timedelta(hours=24)
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.funnel_id == funnel.id,
        models.ScheduledTrigger.created_at >= since
    ).order_by(models.ScheduledTrigger.created_at.desc()).all()
    
    print(f"Found {len(triggers)} triggers in the last 24h.")
    
    for t in triggers:
        print(f"ID: {t.id} | Status: {t.status} | Created: {t.created_at} | Phone: {t.contact_phone}")
        
        # Check MessageStatus
        statuses = db.query(models.MessageStatus).filter(
            models.MessageStatus.trigger_id == t.id
        ).all()
        
        if not statuses:
            print("  - No messages found in message_status")
        else:
            for s in statuses:
                print(f"  - Msg: {s.message_id} | Status: {s.status} | Phone: {s.phone_number} | Failure: {s.failure_reason}")

if __name__ == "__main__":
    debug_trigger()

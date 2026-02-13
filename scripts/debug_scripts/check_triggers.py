
import sys
import os
from dotenv import load_dotenv

# Add backend directory to sys.path
backend_dir = os.path.join(os.getcwd(), 'backend')
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Load .env explicitly
load_dotenv(os.path.join(backend_dir, '.env'))

from backend.database import SessionLocal
from backend.models import ScheduledTrigger
from datetime import datetime, timezone, timedelta

def check_triggers():
    db = SessionLocal()
    try:
        # Check triggers created in last 24h
        triggers = db.query(ScheduledTrigger).order_by(ScheduledTrigger.created_at.desc()).limit(10).all()

        print(f"Found {len(triggers)} recent triggers:")
        for t in triggers:
            print(f"ID: {t.id} | Status: {t.status} | Funnel: {t.funnel_id} | Created: {t.created_at}")
    except Exception as e:
        print(f"Error checking triggers: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_triggers()

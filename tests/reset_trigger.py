
import os
import sys
# Force Local DB
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/zapvoice"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from database import SessionLocal
import models

def reset_stuck_triggers():
    db = SessionLocal()
    stuck_id = 39
    
    print(f"🔄 Resetting Trigger {stuck_id}...")
    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == stuck_id).first()
    
    if trigger:
        print(f"Current Status: {trigger.status}")
        print(f"Template Name: {trigger.template_name}")
        
        trigger.status = 'queued'
        db.commit()
        print("✅ Status reset to 'queued'. Scheduler should pick it up.")
    else:
        print("❌ Trigger not found.")
        
    db.close()

if __name__ == "__main__":
    reset_stuck_triggers()

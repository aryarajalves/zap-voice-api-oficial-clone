
from database import SessionLocal
import models
import json

def check_trigger(trigger_id):
    db = SessionLocal()
    try:
        t = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
        if not t:
            print(f"Trigger {trigger_id} not found")
            return
        
        print(f"Trigger ID: {t.id}")
        print(f"Status: {t.status}")
        print(f"Failure Reason: {t.failure_reason}")
        print(f"Funnel ID: {t.funnel_id}")
        print(f"Contact Phone: {t.contact_phone}")
        print(f"History: {json.dumps(t.execution_history, indent=2)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_trigger(371)

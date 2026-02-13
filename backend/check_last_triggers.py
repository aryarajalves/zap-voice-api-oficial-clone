
from database import SessionLocal
import models
from datetime import datetime

def check_triggers():
    db = SessionLocal()
    try:
        triggers = db.query(models.ScheduledTrigger).order_by(models.ScheduledTrigger.id.desc()).limit(10).all()
        print(f"{'ID':<5} | {'Status':<12} | {'Phone':<15} | {'Funnel':<10} | {'Node':<20}")
        print("-" * 80)
        for t in triggers:
            fid = str(t.funnel_id) if t.funnel_id else "None"
            node = str(t.current_node_id) if t.current_node_id else "START"
            phone = str(t.contact_phone) if t.contact_phone else "None"
            print(f"{t.id:<5} | {t.status:<12} | {phone:<15} | {fid:<10} | {node:<20}")
    finally:
        db.close()

if __name__ == "__main__":
    check_triggers()

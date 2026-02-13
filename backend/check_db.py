from database import SessionLocal
import models

db = SessionLocal()
try:
    print("--- Funnels ---")
    funnels = db.query(models.Funnel).all()
    for f in funnels:
        print(f"ID: {f.id}, Name: {f.name}, Trigger: '{f.trigger_phrase}'")
    
    print("\n--- Scheduled Triggers ---")
    triggers = db.query(models.ScheduledTrigger).all()
    for t in triggers:
        print(f"ID: {t.id}, Template: {t.template_name}, Sent: {t.total_sent}, DL: {t.total_delivered}, Read: {t.total_read}, Inter: {t.total_interactions}")
    
    print("\n--- Message Statuses ---")
    messages = db.query(models.MessageStatus).all()
    for m in messages:
        print(f"ID: {m.id}, TrigID: {m.trigger_id}, Status: {m.status}, Interaction: {m.is_interaction}")
finally:
    db.close()

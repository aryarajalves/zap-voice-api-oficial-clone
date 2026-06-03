import os, sys
sys.path.insert(0, 'backend')
from database import SessionLocal
import models

db = SessionLocal()
try:
    trigger = db.query(models.ScheduledTrigger).filter_by(id=1021).first()
    if trigger:
        print("Trigger ID:", trigger.id)
        print("Template Name:", trigger.template_name)
        print("button_actions:", trigger.button_actions)
        print("is_recurring:", trigger.is_recurring)
        print("recurring_trigger_id:", trigger.recurring_trigger_id)
        
        if trigger.recurring_trigger_id:
            rt = db.query(models.RecurringTrigger).filter_by(id=trigger.recurring_trigger_id).first()
            if rt:
                print("RecurringTrigger ID:", rt.id)
                print("rt.button_actions:", rt.button_actions)
    else:
        print("Trigger 1021 não encontrado")
finally:
    db.close()

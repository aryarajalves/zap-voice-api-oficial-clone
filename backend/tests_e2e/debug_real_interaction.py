
import os
import sys
# Ensure backend in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

# Force Local DB
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/zapvoice"

from database import SessionLocal
import models
from sqlalchemy import desc


def check_interaction():
    db = SessionLocal()
    phone = "558596123586" # User provided phone
    
    with open("interaction_debug.log", "w", encoding="utf-8") as f:
        f.write(f"Checking records for {phone}...\n\n")
        
        # 1. Check Message Status (Last 5)
        messages = db.query(models.MessageStatus).filter(
            models.MessageStatus.phone_number == phone
        ).order_by(desc(models.MessageStatus.updated_at)).limit(5).all()
        
        f.write(f"--- Last 5 Messages for {phone} ---\n")
        for msg in messages:
            f.write(f"ID: {msg.message_id} | Status: {msg.status} | Interaction: {msg.is_interaction} | Updated: {msg.updated_at}\n")
            
        # 2. Check Triggers (Last 5)
        triggers = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.contact_phone == phone
        ).order_by(desc(models.ScheduledTrigger.created_at)).limit(5).all()
        
        f.write(f"\n--- Last 5 Triggers for {phone} ---\n")
        for t in triggers:
            f.write(f"ID: {t.id} | Status: {t.status} | Template: {t.template_name} | Funnel ID: {t.funnel_id} | Created: {t.created_at}\n")

        # 3. Check for the Funnel Keyword
        keyword = "Pode falar sim!"
        funnels = db.query(models.Funnel).filter(
            models.Funnel.trigger_phrase.ilike(f"%{keyword}%")
        ).all()
        
        f.write(f"\n--- Funnels matching keyword '{keyword}' ---\n")
        for fn in funnels:
            f.write(f"ID: {fn.id} | Name: {fn.name} | Phrase: '{fn.trigger_phrase}' | Client ID: {fn.client_id}\n")

    db.close()
    print("Done. Check interaction_debug.log")

if __name__ == "__main__":
    check_interaction()

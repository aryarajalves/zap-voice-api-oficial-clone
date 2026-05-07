import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from database import SessionLocal
import models

def inspect():
    db = SessionLocal()
    try:
        # Integration ID from logs
        integration_id = "40cef9fa-6904-4c83-9a92-28108f5337a6"
        
        integration = db.query(models.WebhookIntegration).filter(models.WebhookIntegration.id == integration_id).first()
        if not integration:
            print(f"Integration {integration_id} not found!")
            return
            
        print(f"Integration: {integration.name} ({integration.platform})")
        
        print("\n--- Mappings ---")
        mappings = db.query(models.WebhookEventMapping).filter(models.WebhookEventMapping.integration_id == integration_id).all()
        for m in mappings:
            print(f"Event: {m.event_type} | Funnel: {m.funnel_id} | Template: {m.template_name}")
            
        print("\n--- Recent History ---")
        history = db.query(models.WebhookHistory).filter(models.WebhookHistory.integration_id == integration_id).order_by(models.WebhookHistory.created_at.desc()).limit(3).all()
        for h in history:
            print(f"ID: {h.id} | Event: {h.event_type} | Status: {h.status}")
            print(f"Processed Data: {h.processed_data}")
            print("-" * 20)
            
        print("\n--- Recent Triggers ---")
        triggers = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.integration_id == integration_id).order_by(models.ScheduledTrigger.created_at.desc()).limit(3).all()
        for t in triggers:
            print(f"ID: {t.id} | Event: {t.event_type} | Phone: {t.contact_phone} | Status: {t.status} | Product: {t.product_name}")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect()

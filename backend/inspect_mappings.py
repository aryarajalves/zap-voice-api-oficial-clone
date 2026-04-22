
import os
from database import SessionLocal
import models
import uuid

def debug():
    db = SessionLocal()
    try:
        print("--- Webhook Integrations ---")
        ints = db.query(models.WebhookIntegration).all()
        for i in ints:
            print(f"ID: {i.id} | Name: {i.name} | Platform: {i.platform}")
            mappings = db.query(models.WebhookEventMapping).filter(models.WebhookEventMapping.integration_id == i.id).all()
            for m in mappings:
                print(f"  Mapping: Event={m.event_type} | Template={m.template_name} | ID={m.template_id}")
        
        print("\n--- Recent Webhook History ---")
        history = db.query(models.WebhookHistory).order_by(models.WebhookHistory.created_at.desc()).limit(5).all()
        for h in history:
            print(f"ID: {h.id} | EventType: {h.event_type} | Status: {h.status}")
            print(f"  ParsedData: {h.processed_data}")
            print(f"  IntegrationID: {h.integration_id}")
    finally:
        db.close()

if __name__ == "__main__":
    debug()

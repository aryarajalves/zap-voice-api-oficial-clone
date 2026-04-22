
from database import SessionLocal
import models
import uuid

db = SessionLocal()
try:
    integration_id = "bb3a4dfa-7060-4152-8889-5f3822f9dc59"
    uuid_obj = uuid.UUID(integration_id)
    
    integration = db.query(models.WebhookIntegration).filter(models.WebhookIntegration.id == uuid_obj).first()
    if not integration:
        print(f"Integration {integration_id} not found")
    else:
        print(f"Integration: {integration.name} ({integration.platform})")
        
        mappings = db.query(models.WebhookEventMapping).filter(models.WebhookEventMapping.integration_id == uuid_obj).all()
        print(f"\nMappings ({len(mappings)}):")
        for m in mappings:
            print(f"- Event: {m.event_type} | Template: {m.template_name} | Active: {m.is_active} | Cancel: {m.cancel_events}")
            
        history = db.query(models.WebhookHistory).filter(models.WebhookHistory.integration_id == uuid_obj).order_by(models.WebhookHistory.created_at.desc()).limit(5).all()
        print(f"\nRecent History ({len(history)}):")
        for h in history:
            print(f"- Time: {h.created_at} | Event: {h.event_type} | Status: {h.status} | Phone: {h.processed_data.get('phone') if h.processed_data else '?'}")
            
        triggers = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.integration_id == uuid_obj).order_by(models.ScheduledTrigger.created_at.desc()).limit(5).all()
        print(f"\nRecent Triggers ({len(triggers)}):")
        for t in triggers:
            print(f"- Time: {t.created_at} | Event: {t.event_type} | Status: {t.status} | Phone: {t.contact_phone} | Template: {t.template_name}")

finally:
    db.close()

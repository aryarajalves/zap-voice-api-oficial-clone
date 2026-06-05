import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from database import SessionLocal
import models

db = SessionLocal()

print("--- Webhook Integrations ---")
integrations = db.query(models.WebhookIntegration).all()
for i in integrations:
    print(f"ID: {i.id} | Name: {i.name} | Client ID: {i.client_id} | Platform: {i.platform} | Status: {i.status}")

print("\n--- Webhook Event Mappings ---")
mappings = db.query(models.WebhookEventMapping).all()
for m in mappings:
    print(f"ID: {m.id} | Integration ID: {m.integration_id} | Event: {m.event_type} | Template Name: {m.template_name} | Followup Template Name: {m.followup_template_name} | Active: {m.is_active}")

print("\n--- WhatsApp Template Cache ---")
templates = db.query(models.WhatsAppTemplateCache).all()
for t in templates:
    print(f"ID: {t.id} | Name: {t.name} | Client ID: {t.client_id} | Archived: {t.is_archived}")

db.close()

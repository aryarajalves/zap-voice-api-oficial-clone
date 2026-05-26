from database import SessionLocal
import models

db = SessionLocal()
try:
    print("Checking cached templates in whatsapp_template_cache:")
    templates = db.query(models.WhatsAppTemplateCache).all()
    print(f"Total cached templates: {len(templates)}")
    for t in templates:
        print(f"ID: {t.id} | Client ID: {t.client_id} | Name: {t.name} | Language: {t.language} | Has Body: {bool(t.body)}")
        if "webinaro" in t.name or "convite" in t.name:
            print(f" -> Found match: {t.name} | Body: {t.body}")
finally:
    db.close()

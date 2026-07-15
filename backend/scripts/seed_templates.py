import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.trigger import WhatsAppTemplateCache
from database import SessionLocal

def main():
    db = SessionLocal()
    try:
        template_name = "convite_base_webinaro"
        
        # We will insert for client 1 and client 11 (and any other client we find to be safe)
        client_ids = [1, 11]
        
        for client_id in client_ids:
            existing = db.query(WhatsAppTemplateCache).filter(
                WhatsAppTemplateCache.client_id == client_id,
                WhatsAppTemplateCache.name == template_name
            ).first()
            
            if existing:
                print(f"Template {template_name} already exists for client {client_id}. Updating...")
                existing.body = "Olá {{1}}, tudo bem?"
                existing.components = [{"type": "BODY", "text": "Olá {{1}}, tudo bem?"}]
                existing.language = "pt_BR"
                existing.category = "MARKETING"
                existing.is_archived = False
            else:
                print(f"Creating template {template_name} for client {client_id}...")
                new_tmpl = WhatsAppTemplateCache(
                    id=900000000000 + client_id,
                    client_id=client_id,
                    name=template_name,
                    language="pt_BR",
                    body="Olá {{1}}, tudo bem?",
                    components=[{"type": "BODY", "text": "Olá {{1}}, tudo bem?"}],
                    category="MARKETING",
                    is_archived=False,
                    is_pinned=False
                )
                db.add(new_tmpl)
        
        db.commit()
        print("Templates seeded successfully for multiple clients!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding templates: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

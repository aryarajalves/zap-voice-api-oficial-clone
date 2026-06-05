import os
from database import SessionLocal
from models import WhatsAppTemplateCache

db = SessionLocal()
try:
    tpls = db.query(WhatsAppTemplateCache).all()
    print("Total templates in cache:", len(tpls))
    for t in tpls:
        print(f"ID: {t.id} | Name: {t.name} | Client ID: {t.client_id} | Is Archived: {t.is_archived} | Is Pinned: {t.is_pinned}")
finally:
    db.close()

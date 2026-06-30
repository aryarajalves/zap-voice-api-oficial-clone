import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models

db = SessionLocal()
try:
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == 9
    ).all()
    print(f"Encontrados {len(leads)} leads para Client ID 9:")
    for lead in leads:
        print(f"ID: {lead.id} | Nome: {lead.name} | Phone: {lead.phone} | BSUD: {lead.bsud} | Locked: {getattr(lead, 'is_locked', False)}")
finally:
    db.close()

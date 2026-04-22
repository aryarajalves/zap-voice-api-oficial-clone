import sys
import os
import json

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session, joinedload
from database import SessionLocal
import models
from fastapi.encoders import jsonable_encoder

def summarize_integrations():
    db = SessionLocal()
    integrations = db.query(models.WebhookIntegration).options(
        joinedload(models.WebhookIntegration.mappings)
    ).all()
    enc = jsonable_encoder(integrations)
    for integ in enc:
        print(f"Integration: {integ['name']} (Mappings: {len(integ.get('mappings', []))})")
        for m in integ.get('mappings', []):
            print(f"  - {m['event_type']} | is_active: {m.get('is_active')} | ID: {m['id']}")
    db.close()

if __name__ == "__main__":
    summarize_integrations()

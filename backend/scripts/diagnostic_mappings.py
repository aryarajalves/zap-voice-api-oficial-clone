import sys
import os
import json

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
import models
import schemas
from fastapi.encoders import jsonable_encoder

def debug_mappings():
    db = SessionLocal()
    try:
        integrations = db.query(models.WebhookIntegration).all()
        for integration in integrations:
            print(f"\nIntegration: {integration.name} ({integration.id})")
            # Validação via Pydantic
            validated = schemas.WebhookIntegration.model_validate(integration)
            data = jsonable_encoder(validated)
            
            for m in data.get('mappings', []):
                print(f"  - Event: {m.get('event_type')} | Is Active: {m.get('is_active')} (Type: {type(m.get('is_active'))})")
                if m.get('is_active') is None:
                    print("    ⚠️ WARNING: is_active is NONE!")
    finally:
        db.close()

if __name__ == "__main__":
    debug_mappings()

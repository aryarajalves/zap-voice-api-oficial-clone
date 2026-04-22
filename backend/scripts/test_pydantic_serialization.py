import sys
import os

# Adiciona o diretório backend ao sys.path para importações funcionarem
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas
import json

def test_serialization():
    db = SessionLocal()
    mappings = db.query(models.WebhookEventMapping).filter(models.WebhookEventMapping.is_active == False).all()
    for m in mappings:
        print("DB ID:", m.id, "DB is_active:", m.is_active)
        # Test Pydantic serialization
        schema_m = schemas.WebhookEventMapping.model_validate(m)
        print("Pydantic is_active:", schema_m.is_active)
        print("JSON Dump:", schema_m.model_dump())
    db.close()

if __name__ == "__main__":
    test_serialization()

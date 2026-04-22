import sys
import os

# Adicionar caminho do app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
from routers.webhooks_public import process_webhook
from fastapi import BackgroundTasks
import uuid
import json

def db_test():
    db = SessionLocal()
    return db

def test_inactive_mapping_suppression(db: Session):
    # 1. Create a client and integration
    client = db.query(models.Client).first()
    if not client:
        client = models.Client(name="Test Client", slug="test-client")
        db.add(client)
        db.commit()
    
    integ_id = uuid.uuid4()
    integration = models.WebhookIntegration(
        id=integ_id,
        client_id=client.id,
        name="Test Inactive",
        platform="hotmart",
        status="active"
    )
    db.add(integration)
    
    # 2. Add an INACTIVE mapping
    mapping = models.WebhookEventMapping(
        integration_id=integ_id,
        event_type="compra_aprovada",
        template_name="test_template",
        is_active=False
    )
    db.add(mapping)
    db.commit()
    
    # 3. Process a webhook for this event
    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "purchase": {"status": "APPROVED"},
            "buyer": {"name": "Test User", "checkout_phone": "5511999999999"}
        }
    }
    
    from unittest.mock import MagicMock
    bg_tasks = MagicMock(spec=BackgroundTasks)
    
    result = process_webhook(str(integ_id), payload, bg_tasks, db)
    
    # 4. Verify result is 'ignored' and reason is 'no_mapping' (because the only mapping was inactive)
    assert result["status"] == "ignored"
    assert "no_mapping" in result["reason"]
    
    # Cleanup
    db.delete(mapping)
    db.delete(integration)
    db.commit()

if __name__ == "__main__":
    # To run manually inside docker
    db_session = SessionLocal()
    try:
        test_inactive_mapping_suppression(db_session)
        print("✅ Backend Test Passed: Inactive mapping was correctly ignored.")
    except Exception as e:
        print(f"❌ Backend Test Failed: {e}")
    finally:
        db_session.close()

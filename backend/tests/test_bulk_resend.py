import sys
import os
import uuid
import json
from datetime import datetime
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Override for local execution if running outside Docker
if os.getenv("DATABASE_URL") and "zapvoice-postgres" in os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL").replace("zapvoice-postgres", "localhost").replace(":5432/", ":5435/")
if os.getenv("RABBITMQ_HOST") == "zapvoice-rabbit":
    os.environ["RABBITMQ_HOST"] = "localhost"
    os.environ["RABBITMQ_PORT"] = "5679"

# Add parent directory to path first to avoid site-packages conflicts
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
import models
from routers.webhooks_integrations import execute_webhook_resend_logic

async def run_test_logic(h1_id, h2_id, client_id, db, bt):
    r1 = await execute_webhook_resend_logic(h1_id, client_id, db, bt)
    r2 = await execute_webhook_resend_logic(h2_id, client_id, db, bt)
    return r1, r2

def test_bulk_resend():
    db = SessionLocal()
    try:
        # 1. Create a dummy integration
        # Find a valid client_id or create one if needed, but usually 1 exists in dev
        client = db.query(models.Client).first()
        if not client:
            client = models.Client(name="Test Client")
            db.add(client)
            db.flush()
        client_id = client.id

        integration = models.WebhookIntegration(
            id=uuid.uuid4(),
            name="Test Bulk Resend",
            platform="hotmart",
            client_id=client_id
        )
        db.add(integration)
        db.flush()
        
        # 2. Create a mapping
        mapping = models.WebhookEventMapping(
            integration_id=integration.id,
            event_type="compra_aprovada",
            template_name="Test Template",
            is_active=True
        )
        db.add(mapping)
        db.flush()
        
        # 3. Create dummy history entries
        h1 = models.WebhookHistory(
            integration_id=integration.id,
            event_type="compra_aprovada",
            payload={"event": "PURCHASE_APPROVED", "data": {"buyer": {"checkout_phone": "5511999999999", "name": "User 1"}, "product": {"name": "Prod 1"}, "purchase": {"status": "APPROVED"}}},
            status="received"
        )
        h2 = models.WebhookHistory(
            integration_id=integration.id,
            event_type="compra_aprovada",
            payload={"event": "PURCHASE_APPROVED", "data": {"buyer": {"checkout_phone": "5511888888888", "name": "User 2"}, "product": {"name": "Prod 1"}, "purchase": {"status": "APPROVED"}}},
            status="received"
        )
        db.add(h1)
        db.add(h2)
        db.commit()
        
        print(f"Created history IDs: {h1.id}, {h2.id}")
        
        # 4. Test logic
        class MockBackgroundTasks:
            def add_task(self, func, *args, **kwargs):
                print(f"Mocking background task: {func.__name__}")
        
        bt = MockBackgroundTasks()
        
        res1, res2 = asyncio.run(run_test_logic(h1.id, h2.id, client_id, db, bt))
        
        print(f"Result 1: {res1}")
        print(f"Result 2: {res2}")
        
        # Verify ScheduledTrigger
        triggers = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.integration_id == integration.id).all()
        print(f"Total triggers created: {len(triggers)}")
        
        if len(triggers) == 2:
            print("SUCCESS: Bulk resend logic worked!")
        else:
            print("FAILURE: Triggers count mismatch.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.integration_id == integration.id).delete()
        db.query(models.WebhookHistory).filter(models.WebhookHistory.integration_id == integration.id).delete()
        db.query(models.WebhookEventMapping).filter(models.WebhookEventMapping.integration_id == integration.id).delete()
        db.query(models.WebhookIntegration).filter(models.WebhookIntegration.id == integration.id).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    test_bulk_resend()

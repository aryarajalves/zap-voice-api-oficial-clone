
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import models, schemas
from main import app
from core.deps import get_db
from sqlalchemy.orm import Session
import uuid

# Re-use your database setup or create a simple one here for this specific test
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from routers.webhooks_integrations import get_db as integrations_get_db

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[integrations_get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_webhooks_dispatches_filtering_and_fields():
    db = TestingSessionLocal()
    
    # Setup: Create a client and an integration
    test_client = models.Client(name="Test Client")
    db.add(test_client)
    db.commit()
    db.refresh(test_client)
    
    integration_id = uuid.uuid4()
    integration = models.WebhookIntegration(
        id=integration_id,
        client_id=test_client.id,
        name="Test Integration",
        platform="hotmart",
        status="active"
    )
    db.add(integration)
    
    # Create two triggers: one for this integration, one for another
    t1 = models.ScheduledTrigger(
        client_id=test_client.id,
        integration_id=integration_id, # Use UUID object
        event_type="compra_aprovada",
        scheduled_time=datetime.now(timezone.utc),
        status="pending",
        is_bulk=False,
        contact_phone="5511999999999"
    )
    t2 = models.ScheduledTrigger(
        client_id=test_client.id,
        integration_id=uuid.uuid4(), # Use UUID object
        event_type="pix_gerado",
        scheduled_time=datetime.now(timezone.utc),
        status="pending",
        is_bulk=False,
        contact_phone="5511888888888"
    )
    db.add(t1)
    db.add(t2)
    db.commit()
    
    # Mock auth headers
    headers = {
        "X-Client-ID": str(test_client.id),
        "Authorization": "Bearer fake-token" # We might need to override auth if needed, but let's see if skip_auth works if we mock it
    }
    
    # For simplicity in this test environment, we assume the router uses the client_id from headers
    # and we might need to mock the user authentication if the endpoint is protected.
    # In main.py, typically there is an auth dependency.
    
    # Let's try calling the endpoint (skipping real auth check if possible or providing a mock)
    # If the endpoint requires auth, we should mock the user in the dependency.
    
    from core.security import create_access_token
    token = create_access_token({"sub": "admin@test.com", "role": "super_admin"})
    headers["Authorization"] = f"Bearer {token}"
    
    # We also need a user in the DB for the token to be valid if it checks the DB
    user = models.User(email="admin@test.com", role="super_admin", client_id=test_client.id)
    db.add(user)
    db.commit()

    # Test and verify both the NEW path and the ALIAS
    paths_to_test = [
        f"/api/webhooks/{integration_id}/dispatches",
        f"/api/webhook-integrations/{integration_id}/dispatches"
    ]
    
    for path in paths_to_test:
        response = client.get(path, headers=headers)
        assert response.status_code == 200
        data = response.json()
        items = data["items"]
        
        # Should only return t1
        assert len(items) == 1
        assert items[0]["integration_id"] == str(integration_id)
        assert items[0]["event_type"] == "compra_aprovada"
    
    db.close()

if __name__ == "__main__":
    pytest.main([__file__])

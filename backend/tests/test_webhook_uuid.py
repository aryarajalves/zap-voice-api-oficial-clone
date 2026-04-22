from fastapi.testclient import TestClient
from main import app
import uuid
import pytest

client = TestClient(app)

def test_webhook_events_with_uuid():
    """
    Test that the /webhooks/{webhook_id}/events endpoint 
    accepts a UUID as a string and doesn't return 422.
    """
    random_uuid = str(uuid.uuid4())
    # This route previously had webhook_id: int, causing 422 for UUIDs.
    # We changed it to webhook_id: str to support transition.
    response = client.get(f"/api/webhooks/{random_uuid}/events/")
    
    # It should NOT be 422. It might be 200 (empty list) or something else depending on DB.
    # But 422 means validation error on the path parameter.
    assert response.status_code != 422
    print(f"Response status for UUID {random_uuid}: {response.status_code}")

if __name__ == "__main__":
    test_webhook_events_with_uuid()


import sys
import os

# Add backend to sys.path
sys.path.append('/app/backend')
sys.path.append('/app')

from fastapi.testclient import TestClient
try:
    from backend.main import app
    from backend.models import User
    from backend.core.deps import get_current_user
except ImportError:
    from main import app
    from models import User
    from core.deps import get_current_user

# Mock User
def mock_get_current_user():
    return User(id=1, email="test@test.com", client_id=38)

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

print("Fetching triggers from Mocked App (Docker)...")
# Note: TestClient calls the app directly, completely bypassing the running uvicorn server.
# This proves if the CODE on disk produces the correct output.
# If this works, but the live server doesn't, it means the Live Server process didn't reload the code.
response = client.get("/triggers?limit=1", headers={"X-Client-ID": "38"})
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    if data:
        trigger = data[0]
        print(f"ID: {trigger.get('id')}")
        print(f"total_interactions: {trigger.get('total_interactions')}")
        print(f"total_blocked: {trigger.get('total_blocked')}")
        print(f"Keys: {trigger.keys()}")
    else:
        print("No triggers found")
else:
    print(response.text)

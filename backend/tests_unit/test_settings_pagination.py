from fastapi.testclient import TestClient
from sqlalchemy import text
from main import app
from models import MessageStatus, ScheduledTrigger, User
from database import SessionLocal
import datetime
from core.deps import get_validated_client_id, get_current_user

client = TestClient(app)

# Override dependencies for testing
async def override_get_validated_client_id():
    return 1

async def override_get_current_user():
    return User(id=1, email="test@example.com", role="admin")

app.dependency_overrides[get_validated_client_id] = override_get_validated_client_id
app.dependency_overrides[get_current_user] = override_get_current_user

def test_fetch_synced_contacts_pagination(db_session):
    # Mocking a synced contacts table if it doesn't exist
    sync_table = "contatos_monitorados"
    db_session.execute(text(f"CREATE TABLE IF NOT EXISTS {sync_table} (phone TEXT, name TEXT, inbox_id INTEGER, last_interaction_at TIMESTAMP)"))
    
    # Clean up
    db_session.execute(text(f"DELETE FROM {sync_table}"))
    
    # Insert 25 records
    for i in range(25):
        db_session.execute(
            text(f"INSERT INTO {sync_table} (phone, name, last_interaction_at) VALUES (:phone, :name, :date)"),
            {"phone": f"55119999900{i:02d}", "name": f"User {i}", "date": datetime.datetime.now()}
        )
    db_session.commit()
    
    # Request first 10
    response = client.get("/api/settings/contacts?skip=0&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 25
    assert len(data["items"]) == 10
    
    # Request next 10
    response = client.get("/api/settings/contacts?skip=10&limit=10")
    data = response.json()
    assert len(data["items"]) == 10
    
    # Request last 5
    response = client.get("/api/settings/contacts?skip=20&limit=10")
    data = response.json()
    assert len(data["items"]) == 5

def test_fetch_memory_logs_pagination(db_session):
    # Ensure client 1 exists
    from models import Client
    if not db_session.query(Client).filter(Client.id == 1).first():
        db_session.add(Client(id=1, name="Test Client"))
        db_session.commit()

    # Create a trigger for client 1
    trigger = ScheduledTrigger(
        client_id=1,
        status='completed',
        scheduled_time=datetime.datetime.now()
    )
    db_session.add(trigger)
    db_session.commit()
    
    # Insert 15 memory logs for this trigger
    for i in range(15):
        ms = MessageStatus(
            trigger_id=trigger.id,
            phone_number=f"55119888800{i:02d}",
            status="delivered",
            memory_webhook_status="sent",
            content=f"Memory content {i}",
            timestamp=datetime.datetime.now()
        )
        db_session.add(ms)
    db_session.commit()
    
    # Request first 10
    response = client.get("/api/settings/memory-logs?skip=0&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 15
    assert len(data["items"]) == 10
    
    # Request next 5
    response = client.get("/api/settings/memory-logs?skip=10&limit=10")
    data = response.json()
    assert len(data["items"]) == 5

if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("Running test_fetch_synced_contacts_pagination...")
        test_fetch_synced_contacts_pagination(db)
        print("✅ test_fetch_synced_contacts_pagination passed!")
        
        print("Running test_fetch_memory_logs_pagination...")
        test_fetch_memory_logs_pagination(db)
        print("✅ test_fetch_memory_logs_pagination passed!")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        # Clean up overrides
        app.dependency_overrides = {}

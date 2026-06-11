import pytest
import os
import sys
from datetime import datetime, timezone
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, Client, Funnel, ScheduledTrigger, MessageStatus
from core.security import get_password_hash, create_access_token
from core.deps import get_db

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client_obj(db):
    c = Client(name="EnhancedTriggersTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.fixture
def super_admin(db, client_obj):
    user = User(
        email="enhanced_admin@test.com",
        hashed_password=get_password_hash("pass"),
        role="super_admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_headers(super_admin, client_obj):
    token = create_access_token({"sub": super_admin.email, "role": super_admin.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }

@pytest.fixture
def app_client(db):
    from main import app
    import routers.triggers as triggers_router

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        app.dependency_overrides[triggers_router.get_db] = override_get_db
    except AttributeError:
        pass
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def funnel(db, client_obj):
    f = Funnel(name="EnhancedTriggerFunnel", client_id=client_obj.id, steps=[])
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

def test_get_trigger_messages_private_note_filter(app_client, auth_headers, db, client_obj, funnel):
    # 1. Create Trigger
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    
    # 2. Create MessageStatus with Private Note
    ms1 = MessageStatus(
        trigger_id=t.id,
        message_id="msg_note_001",
        phone_number="5511900001111",
        status="delivered",
        private_note_posted=True # This is the field we want to filter by
    )
    ms2 = MessageStatus(
        trigger_id=t.id,
        message_id="msg_no_note_002",
        phone_number="5511900002222",
        status="delivered",
        private_note_posted=False
    )
    db.add(ms1)
    db.add(ms2)
    db.commit()
    
    # 3. Test Filter
    resp = app_client.get(f"/api/triggers/{t.id}/messages?status_filter=private_note", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["message_id"] == "msg_note_001"
    
    # 4. Test Counts
    assert data["counts"]["private_note"] == 1

def test_get_trigger_messages_type_filter(app_client, auth_headers, db, client_obj, funnel):
    # 1. Create Trigger
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    
    # 2. Create MessageStatus entries with different message types
    ms1 = MessageStatus(
        trigger_id=t.id,
        message_id="msg_paid_001",
        phone_number="5511911110000",
        status="delivered",
        message_type="TEMPLATE",
        meta_price_brl=0.05
    )
    ms2 = MessageStatus(
        trigger_id=t.id,
        message_id="msg_free_002",
        phone_number="5511922220000",
        status="delivered",
        message_type="FREE_MESSAGE"
    )
    db.add(ms1)
    db.add(ms2)
    db.commit()
    
    # 3. Test Template Filter
    resp = app_client.get(f"/api/triggers/{t.id}/messages?message_type=template", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["message_id"] == "msg_paid_001"
    
    # 4. Test Free Filter
    resp = app_client.get(f"/api/triggers/{t.id}/messages?message_type=free", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["message_id"] == "msg_free_002"

def test_get_trigger_messages_failure_reason_filter(app_client, auth_headers, db, client_obj, funnel):
    # 1. Create Trigger
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    
    # 2. Create MessageStatus entries with failure reasons
    ms1 = MessageStatus(
        trigger_id=t.id,
        message_id="msg_err_001",
        phone_number="5511911110001",
        status="failed",
        failure_reason="Too Many Requests"
    )
    ms2 = MessageStatus(
        trigger_id=t.id,
        message_id="msg_err_002",
        phone_number="5511922220002",
        status="failed",
        failure_reason="Invalid Number"
    )
    db.add(ms1)
    db.add(ms2)
    db.commit()
    
    # 3. Test API returning list of failure reasons
    resp = app_client.get(f"/api/triggers/{t.id}/messages", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "failure_reasons" in data
    assert sorted(data["failure_reasons"]) == ["Invalid Number", "Too Many Requests"]

    # 4. Test filtering by specific failure reason
    resp = app_client.get(f"/api/triggers/{t.id}/messages?failure_reason=Too+Many+Requests", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["message_id"] == "msg_err_001"


def test_schedule_bulk_send_cleanup_failures(app_client, auth_headers, db, client_obj, funnel):
    # 1. Create original trigger
    t_orig = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=True,
        total_contacts=5,
        total_failed=3,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t_orig)
    db.commit()

    # 2. Create failed message status entries
    ms1 = MessageStatus(
        trigger_id=t_orig.id,
        phone_number="5511999990001",
        status="failed",
        failure_reason="Too Many Requests"
    )
    ms2 = MessageStatus(
        trigger_id=t_orig.id,
        phone_number="5511999990002",
        status="failed",
        failure_reason="Too Many Requests"
    )
    ms3 = MessageStatus(
        trigger_id=t_orig.id,
        phone_number="5511999990003",
        status="failed",
        failure_reason="Invalid Number"
    )
    db.add(ms1)
    db.add(ms2)
    db.add(ms3)
    db.commit()

    # 3. Schedule new bulk send targeting two of these failed numbers
    payload = {
        "schedule_at": datetime.now(timezone.utc).isoformat(),
        "template_name": "welcome_message",
        "language": "pt_BR",
        "contacts_list": [
            {"phone": "5511999990001"},
            {"phone": "5511999990002"}
        ],
        "remove_failures_from_trigger_id": t_orig.id
    }

    resp = app_client.post("/api/bulk-send/schedule", json=payload, headers=auth_headers)
    assert resp.status_code == 200

    # 4. Check that targeted failed messages were deleted and statistics decremented
    db.expire_all()
    
    # ms1 and ms2 should be deleted, ms3 should remain
    assert db.query(MessageStatus).filter(MessageStatus.id == ms1.id).first() is None
    assert db.query(MessageStatus).filter(MessageStatus.id == ms2.id).first() is None
    
    remaining_ms = db.query(MessageStatus).filter(MessageStatus.id == ms3.id).first()
    assert remaining_ms is not None

    # Check updated stats
    trigger_db = db.query(ScheduledTrigger).filter(ScheduledTrigger.id == t_orig.id).first()
    assert trigger_db.total_failed == 1 # 3 - 2 = 1
    assert trigger_db.total_contacts == 3 # 5 - 2 = 3



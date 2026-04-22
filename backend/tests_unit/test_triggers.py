import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
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
    c = Client(name="TriggersTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def super_admin(db, client_obj):
    user = User(
        email="triggers_admin@test.com",
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
    app.dependency_overrides[triggers_router.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def funnel(db, client_obj):
    f = Funnel(name="TriggerFunnel", client_id=client_obj.id, steps=[])
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@pytest.fixture
def trigger_pending(db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="pending",
        is_bulk=False,
        scheduled_time=datetime.now(timezone.utc),
        contact_name="Test",
        contact_phone="5511900001111",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def trigger_processing(db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="processing",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
        contacts_list=[{"phone": "5511900002222"}, {"phone": "5511900003333"}],
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


# -- GET /triggers ------------------------------------------------------------

def test_list_triggers(app_client, auth_headers, trigger_pending):
    resp = app_client.get("/api/triggers", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_list_triggers_filter_status_pending(app_client, auth_headers, trigger_pending):
    resp = app_client.get("/api/triggers?status=pending", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    for item in items:
        assert item["status"] in ["pending", "queued", "Queued"]


def test_list_triggers_filter_bulk(app_client, auth_headers, trigger_processing):
    resp = app_client.get("/api/triggers?trigger_type=bulk", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    for item in items:
        assert item["is_bulk"] is True


def test_list_triggers_unauthenticated(app_client):
    resp = app_client.get("/api/triggers")
    assert resp.status_code == 401


# -- POST /triggers/{id}/cancel -----------------------------------------------

@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_cancel_trigger_success(mock_pub, app_client, auth_headers, trigger_pending):
    resp = app_client.post(f"/api/triggers/{trigger_pending.id}/cancel", headers=auth_headers)
    assert resp.status_code == 200
    assert "cancelled" in resp.json()["message"].lower()


@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_cancel_trigger_already_finished(mock_pub, app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=False,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    resp = app_client.post(f"/api/triggers/{t.id}/cancel", headers=auth_headers)
    assert resp.status_code == 200
    assert "already finished" in resp.json()["message"].lower()


def test_cancel_trigger_not_found(app_client, auth_headers):
    resp = app_client.post("/api/triggers/99999/cancel", headers=auth_headers)
    assert resp.status_code == 404


# -- POST /triggers/{id}/pause ------------------------------------------------

@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_pause_trigger_success(mock_pub, app_client, auth_headers, trigger_processing):
    resp = app_client.post(f"/api/triggers/{trigger_processing.id}/pause", headers=auth_headers)
    assert resp.status_code == 200
    assert "paused" in resp.json()["message"].lower()


@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_pause_trigger_not_processing(mock_pub, app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="pending",
        is_bulk=False,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    resp = app_client.post(f"/api/triggers/{t.id}/pause", headers=auth_headers)
    assert resp.status_code == 400


# -- POST /triggers/{id}/resume -----------------------------------------------

@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_resume_trigger_success(mock_pub, app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="paused",
        is_bulk=False,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    resp = app_client.post(f"/api/triggers/{t.id}/resume", headers=auth_headers)
    assert resp.status_code == 200
    assert "resumed" in resp.json()["message"].lower()


@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_resume_trigger_not_paused(mock_pub, app_client, auth_headers, trigger_pending):
    resp = app_client.post(f"/api/triggers/{trigger_pending.id}/resume", headers=auth_headers)
    assert resp.status_code == 400


# -- POST /triggers/{id}/cancel-with-report -----------------------------------

def test_cancel_with_report_success(app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="processing",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
        contacts_list=[{"phone": "111"}, {"phone": "222"}],
        processed_contacts=[],
        pending_contacts=["111", "222"],
    )
    db.add(t)
    db.commit()
    resp = app_client.post(
        f"/api/triggers/{t.id}/cancel-with-report",
        json={"processed": ["111"], "pending": ["222"], "sent": 1, "failed": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"
    assert "progress" in data


def test_cancel_with_report_already_cancelled(app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="cancelled",
        is_bulk=False,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    resp = app_client.post(f"/api/triggers/{t.id}/cancel-with-report", headers=auth_headers)
    assert resp.status_code == 400


# -- DELETE /triggers/{id} ----------------------------------------------------

@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
def test_delete_trigger_success(mock_pub, app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=False,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    resp = app_client.delete(f"/api/triggers/{t.id}", headers=auth_headers)
    assert resp.status_code == 200


def test_delete_trigger_not_found(app_client, auth_headers):
    resp = app_client.delete("/api/triggers/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_trigger_non_super_admin_forbidden(app_client, db, client_obj):
    regular = User(
        email="regular_trigger@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(regular)
    db.commit()
    token = create_access_token({"sub": "regular_trigger@test.com", "role": "admin"})
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }
    resp = app_client.delete("/api/triggers/1", headers=headers)
    assert resp.status_code == 403


# -- GET /triggers/{id}/failures ----------------------------------------------

def test_list_failures_json_empty(app_client, auth_headers, trigger_pending):
    resp = app_client.get(f"/api/triggers/{trigger_pending.id}/failures", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_failures_json_with_failures(app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    ms = MessageStatus(
        trigger_id=t.id,
        message_id="msg_fail_001",
        phone_number="5511900009999",
        status="failed",
        failure_reason="Number not registered",
    )
    db.add(ms)
    db.commit()
    resp = app_client.get(f"/api/triggers/{t.id}/failures", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["phone"] == "5511900009999"


# -- GET /triggers/{id}/messages ----------------------------------------------

def test_get_trigger_messages(app_client, auth_headers, db, client_obj, funnel):
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="completed",
        is_bulk=True,
        scheduled_time=datetime.now(timezone.utc),
    )
    db.add(t)
    db.commit()
    ms = MessageStatus(
        trigger_id=t.id,
        message_id="msg_read_001",
        phone_number="5511900008888",
        status="read",
        message_type="TEMPLATE",
    )
    db.add(ms)
    db.commit()
    resp = app_client.get(f"/api/triggers/{t.id}/messages", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "counts" in data
    assert data["counts"]["all"] >= 1

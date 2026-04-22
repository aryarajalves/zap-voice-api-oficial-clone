import pytest
import os
import sys
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
from models import User, Client, Funnel, ScheduledTrigger
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
    c = Client(name="SchedulesTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="schedules_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user, client_obj):
    token = create_access_token({"sub": test_user.email, "role": test_user.role})
    return {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_obj.id),
    }


@pytest.fixture
def app_client(db):
    from main import app
    import routers.schedules as schedules_router

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[schedules_router.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def funnel(db, client_obj):
    f = Funnel(name="ScheduleFunnel", client_id=client_obj.id, steps=[])
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@pytest.fixture
def pending_trigger(db, client_obj, funnel):
    future = datetime.now(timezone.utc) + timedelta(hours=1)
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="queued",
        is_bulk=False,
        scheduled_time=future,
        contact_name="Test User",
        contact_phone="5511999990000",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


# -- GET /schedules -----------------------------------------------------------

def test_get_schedules_success(app_client, auth_headers, pending_trigger, client_obj):
    now = datetime.now(timezone.utc)
    start = (now - timedelta(hours=1)).isoformat()
    end = (now + timedelta(hours=2)).isoformat()
    resp = app_client.get(
        "/api/schedules/",
        params={"start": start, "end": end},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_schedules_without_client_id(app_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    now = datetime.now(timezone.utc)
    start = now.isoformat()
    end = (now + timedelta(hours=1)).isoformat()
    resp = app_client.get("/api/schedules/", params={"start": start, "end": end}, headers=headers)
    assert resp.status_code == 400


# -- PATCH /schedules/{id} ----------------------------------------------------

def test_update_schedule_time(app_client, auth_headers, pending_trigger):
    new_time = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
    resp = app_client.patch(
        f"/api/schedules/{pending_trigger.id}",
        json={"new_start_time": new_time},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "atualizado" in resp.json()["message"].lower()


def test_update_schedule_not_found(app_client, auth_headers):
    new_time = datetime.now(timezone.utc).isoformat()
    resp = app_client.patch(
        "/api/schedules/99999",
        json={"new_start_time": new_time},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_update_schedule_processing_forbidden(app_client, auth_headers, db, client_obj, funnel):
    future = datetime.now(timezone.utc) + timedelta(hours=1)
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="processing",
        is_bulk=False,
        scheduled_time=future,
    )
    db.add(t)
    db.commit()
    new_time = datetime.now(timezone.utc).isoformat()
    resp = app_client.patch(
        f"/api/schedules/{t.id}",
        json={"new_start_time": new_time},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# -- DELETE /schedules/{id} ---------------------------------------------------

def test_delete_schedule_success(app_client, auth_headers, db, client_obj, funnel):
    future = datetime.now(timezone.utc) + timedelta(hours=1)
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="queued",
        is_bulk=False,
        scheduled_time=future,
    )
    db.add(t)
    db.commit()
    resp = app_client.delete(f"/api/schedules/{t.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "cancelado" in resp.json()["message"].lower()


def test_delete_schedule_not_found(app_client, auth_headers):
    resp = app_client.delete("/api/schedules/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_schedule_processing_forbidden(app_client, auth_headers, db, client_obj, funnel):
    future = datetime.now(timezone.utc)
    t = ScheduledTrigger(
        client_id=client_obj.id,
        funnel_id=funnel.id,
        status="processing",
        is_bulk=False,
        scheduled_time=future,
    )
    db.add(t)
    db.commit()
    resp = app_client.delete(f"/api/schedules/{t.id}", headers=auth_headers)
    assert resp.status_code == 400


# -- POST /schedules/{id}/dispatch --------------------------------------------

def test_dispatch_now_success(app_client, auth_headers, pending_trigger):
    resp = app_client.post(f"/api/schedules/{pending_trigger.id}/dispatch", headers=auth_headers)
    assert resp.status_code == 200
    assert "disparo" in resp.json()["message"].lower()


def test_dispatch_now_not_found(app_client, auth_headers):
    resp = app_client.post("/api/schedules/99999/dispatch", headers=auth_headers)
    assert resp.status_code == 404

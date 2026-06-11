import pytest
import os
import sys
from datetime import datetime, timedelta

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, RestingContact
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
    c = Client(name="RestingTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="resting_user@test.com",
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

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def resting_contact(db, client_obj):
    contact = RestingContact(
        client_id=client_obj.id,
        phone="5511987654321",
        name="Resting Person",
        reason="Meta 131049",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


# -- GET /resting -------------------------------------------------------------

def test_list_resting_contacts(app_client, auth_headers, resting_contact):
    resp = app_client.get("/api/resting/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(c["phone"] == "5511987654321" for c in data)


# -- POST /resting ------------------------------------------------------------

def test_rest_contact_success(app_client, auth_headers):
    resp = app_client.post(
        "/api/resting/",
        json={"phone": "5521912345678", "name": "New Rest", "reason": "Test", "hours": 24},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["phone"] == "5521912345678"


def test_rest_contact_invalid_phone(app_client, auth_headers):
    resp = app_client.post(
        "/api/resting/",
        json={"phone": "abc", "name": "Invalid"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_rest_contact_duplicate(app_client, auth_headers, resting_contact):
    # Same last 8 digits
    resp = app_client.post(
        "/api/resting/",
        json={"phone": "5511987654321"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# -- POST /resting/check_bulk -------------------------------------------------

def test_check_bulk_resting(app_client, auth_headers, resting_contact):
    resp = app_client.post(
        "/api/resting/check_bulk",
        json={"phones": ["5511987654321", "5521900000000"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "5511987654321" in data["resting_phones"]
    assert "5521900000000" not in data["resting_phones"]


# -- DELETE /resting/{id} -----------------------------------------------------

def test_unrest_contact_success(app_client, auth_headers, db, client_obj):
    contact = RestingContact(
        client_id=client_obj.id,
        phone="5531988887777",
        expires_at=datetime.utcnow() + timedelta(hours=2)
    )
    db.add(contact)
    db.commit()
    resp = app_client.delete(f"/api/resting/{contact.id}", headers=auth_headers)
    assert resp.status_code == 204


# -- POST /resting/rest_bulk --------------------------------------------------

def test_rest_bulk_success(app_client, auth_headers):
    resp = app_client.post(
        "/api/resting/rest_bulk",
        json={
            "contacts": [
                {"phone": "5551900001111", "reason": "Bulk rest", "hours": 24},
                {"phone": "5551900002222", "reason": "Bulk rest", "hours": 24},
            ]
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success_count"] == 2
    assert data["already_resting_count"] == 0

import pytest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, BlockedContact
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
    c = Client(name="BlockedTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="blocked_user@test.com",
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
def blocked_contact(db, client_obj):
    contact = BlockedContact(
        client_id=client_obj.id,
        phone="5511987654321",
        name="Blocked Person",
        reason="Spam",
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


# -- GET /blocked -------------------------------------------------------------

def test_list_blocked_contacts(app_client, auth_headers, blocked_contact):
    resp = app_client.get("/api/blocked/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(c["phone"] == "5511987654321" for c in data)


# -- POST /blocked ------------------------------------------------------------

def test_block_contact_success(app_client, auth_headers):
    resp = app_client.post(
        "/api/blocked/",
        json={"phone": "5521912345678", "name": "New Block", "reason": "Test"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["phone"] == "5521912345678"


def test_block_contact_invalid_phone(app_client, auth_headers):
    resp = app_client.post(
        "/api/blocked/",
        json={"phone": "abc", "name": "Invalid"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_block_contact_duplicate(app_client, auth_headers, blocked_contact):
    # Same last 8 digits
    resp = app_client.post(
        "/api/blocked/",
        json={"phone": "5511987654321"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# -- POST /blocked/check_bulk -------------------------------------------------

def test_check_bulk_blocked(app_client, auth_headers, blocked_contact):
    resp = app_client.post(
        "/api/blocked/check_bulk",
        json={"phones": ["5511987654321", "5521900000000"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "5511987654321" in data["blocked_phones"]
    assert "5521900000000" not in data["blocked_phones"]


def test_check_bulk_blocked_empty_list(app_client, auth_headers):
    resp = app_client.post(
        "/api/blocked/check_bulk",
        json={"phones": []},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["blocked_phones"] == []


# -- DELETE /blocked/{id} -----------------------------------------------------

def test_unblock_contact_success(app_client, auth_headers, db, client_obj):
    contact = BlockedContact(client_id=client_obj.id, phone="5531988887777")
    db.add(contact)
    db.commit()
    resp = app_client.delete(f"/api/blocked/{contact.id}", headers=auth_headers)
    assert resp.status_code == 204


def test_unblock_contact_not_found(app_client, auth_headers):
    resp = app_client.delete("/api/blocked/99999", headers=auth_headers)
    assert resp.status_code == 404


# -- POST /blocked/unblock_bulk -----------------------------------------------

def test_unblock_bulk(app_client, auth_headers, db, client_obj):
    c1 = BlockedContact(client_id=client_obj.id, phone="5541977776666")
    c2 = BlockedContact(client_id=client_obj.id, phone="5541966665555")
    db.add_all([c1, c2])
    db.commit()
    resp = app_client.post(
        "/api/blocked/unblock_bulk",
        json={"ids": [c1.id, c2.id]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["deleted_count"] == 2


# -- POST /blocked/block_bulk -------------------------------------------------

def test_block_bulk_success(app_client, auth_headers):
    resp = app_client.post(
        "/api/blocked/block_bulk",
        json={
            "contacts": [
                {"phone": "5551900001111", "reason": "Bulk"},
                {"phone": "5551900002222", "reason": "Bulk"},
            ]
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success_count"] == 2
    assert data["already_blocked_count"] == 0


def test_block_bulk_skips_duplicates(app_client, auth_headers, blocked_contact):
    resp = app_client.post(
        "/api/blocked/block_bulk",
        json={"contacts": [{"phone": "5511987654321"}]},  # same as blocked_contact
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["already_blocked_count"] == 1

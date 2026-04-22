import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Usa in-memory para evitar disk I/O em disco cheio
os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client
from core.security import get_password_hash, create_access_token
from core.deps import get_db

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client_app(db):
    from main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    # Mocka o worker para não bloquear na conexão com RabbitMQ durante testes
    with patch("worker.start_worker", new_callable=AsyncMock), \
         patch("rabbitmq_client.RabbitMQClient.connect", new_callable=AsyncMock):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()


@pytest.fixture
def super_admin(db):
    existing = db.query(User).filter(User.email == "admin@test.com").first()
    if existing:
        return existing
    client = Client(name="TestClient_Auth")
    db.add(client)
    db.commit()
    user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        role="super_admin",
        is_active=True,
        client_id=client.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(super_admin):
    token = create_access_token({"sub": super_admin.email, "role": super_admin.role})
    return {"Authorization": f"Bearer {token}"}


# ── /api/auth/token ───────────────────────────────────────────────────────────

def test_login_success(client_app, super_admin):
    resp = client_app.post(
        "/api/auth/token",
        data={"username": "admin@test.com", "password": "admin123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client_app, super_admin):
    resp = client_app.post(
        "/api/auth/token",
        data={"username": "admin@test.com", "password": "wrongpass"},
    )
    assert resp.status_code == 401


def test_login_user_not_found(client_app):
    resp = client_app.post(
        "/api/auth/token",
        data={"username": "notexist@test.com", "password": "any"},
    )
    assert resp.status_code == 401


def test_login_inactive_user(client_app, db):
    client = Client(name="InactiveClient_Auth")
    db.add(client)
    db.commit()
    inactive = User(
        email="inactive@test.com",
        hashed_password=get_password_hash("pass"),
        role="user",
        is_active=False,
        client_id=client.id,
    )
    db.add(inactive)
    db.commit()
    resp = client_app.post(
        "/api/auth/token",
        data={"username": "inactive@test.com", "password": "pass"},
    )
    assert resp.status_code == 401


# ── /api/auth/me ──────────────────────────────────────────────────────────────

def test_get_me(client_app, auth_headers, super_admin):
    resp = client_app.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "super_admin"


def test_get_me_unauthenticated(client_app):
    resp = client_app.get("/api/auth/me")
    assert resp.status_code == 401


# ── /api/auth/me PUT ──────────────────────────────────────────────────────────

@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_update_my_profile_name(mock_ws, client_app, auth_headers):
    resp = client_app.put(
        "/api/auth/me",
        json={"full_name": "Updated Name"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["full_name"] == "Updated Name"


# ── /api/auth/users ───────────────────────────────────────────────────────────

def test_list_users(client_app, auth_headers):
    resp = client_app.get("/api/auth/users", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_users_unauthorized(client_app, db):
    """Usuário comum não pode listar usuários."""
    client = Client(name="RegularClient_Auth")
    db.add(client)
    db.commit()
    regular = User(
        email="regular@test.com",
        hashed_password=get_password_hash("pass"),
        role="user",
        is_active=True,
        client_id=client.id,
    )
    db.add(regular)
    db.commit()
    token = create_access_token({"sub": "regular@test.com", "role": "user"})
    headers = {"Authorization": f"Bearer {token}"}
    resp = client_app.get("/api/auth/users", headers=headers)
    assert resp.status_code == 403


# ── /api/auth/register ────────────────────────────────────────────────────────

@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_register_user(mock_ws, client_app, auth_headers, db):
    resp = client_app.post(
        "/api/auth/register",
        json={"email": "new@test.com", "password": "newpass123", "full_name": "New User"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "user_id" in resp.json()


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_register_duplicate_email(mock_ws, client_app, auth_headers):
    """Registrar com email já existente e senha diferente retorna 400."""
    client_app.post(
        "/api/auth/register",
        json={"email": "dup@test.com", "password": "pass1"},
        headers=auth_headers,
    )
    resp = client_app.post(
        "/api/auth/register",
        json={"email": "dup@test.com", "password": "differentpass"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# ── /api/auth/users/{id} DELETE ───────────────────────────────────────────────

@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_delete_user(mock_ws, client_app, auth_headers, db):
    client = Client(name="ToDeleteClient_Auth")
    db.add(client)
    db.commit()
    user = User(
        email="todelete@test.com",
        hashed_password=get_password_hash("pass"),
        role="user",
        is_active=True,
        client_id=client.id,
    )
    db.add(user)
    db.commit()
    resp = client_app.delete(f"/api/auth/users/{user.id}", headers=auth_headers)
    assert resp.status_code == 204


def test_delete_self_forbidden(client_app, auth_headers, super_admin):
    resp = client_app.delete(f"/api/auth/users/{super_admin.id}", headers=auth_headers)
    assert resp.status_code == 400


def test_delete_nonexistent_user(client_app, auth_headers):
    resp = client_app.delete("/api/auth/users/99999", headers=auth_headers)
    assert resp.status_code == 404


# ── /api/auth/reset-password ──────────────────────────────────────────────────

def test_reset_password_user_not_found(client_app, auth_headers):
    resp = client_app.post(
        "/api/auth/reset-password",
        json={"email": "ghost@test.com", "new_password": "newpass"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_reset_password_success(client_app, auth_headers, db):
    client = Client(name="ResetClient_Auth")
    db.add(client)
    db.commit()
    user = User(
        email="resetme@test.com",
        hashed_password=get_password_hash("oldpass"),
        role="user",
        is_active=True,
        client_id=client.id,
    )
    db.add(user)
    db.commit()
    resp = client_app.post(
        "/api/auth/reset-password",
        json={"email": "resetme@test.com", "new_password": "newpass123"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "resetme@test.com"

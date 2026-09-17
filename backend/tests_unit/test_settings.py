import pytest
import os
import sys
from unittest.mock import AsyncMock, patch

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, AppConfig
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
    c = Client(name="SettingsTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="settings_user@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=client_obj.id,
    )
    db.add(user)
    # Grant access via many-to-many relationship
    user.accessible_clients.append(client_obj)
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


# -- GET /settings/branding ---------------------------------------------------

def test_get_branding_default(app_client):
    resp = app_client.get("/api/settings/branding")
    assert resp.status_code == 200
    data = resp.json()
    assert "APP_NAME" in data


def test_get_branding_from_db(app_client, db, client_obj):
    cfg = AppConfig(client_id=client_obj.id, key="APP_NAME", value="MeuApp")
    db.add(cfg)
    db.commit()
    resp = app_client.get("/api/settings/branding")
    assert resp.status_code == 200
    assert resp.json()["APP_NAME"] == "MeuApp"


# -- GET /settings ------------------------------------------------------------

def test_get_settings_success(app_client, auth_headers, db, client_obj):
    cfg = AppConfig(client_id=client_obj.id, key="CHATWOOT_API_URL", value="https://app.chatwoot.com")
    db.add(cfg)
    db.commit()
    resp = app_client.get("/api/settings/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "CHATWOOT_API_URL" in data


def test_get_settings_masks_token(app_client, auth_headers, db, client_obj):
    cfg = AppConfig(client_id=client_obj.id, key="WA_ACCESS_TOKEN", value="abcdefghij1234567890")
    db.add(cfg)
    db.commit()
    resp = app_client.get("/api/settings/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    if "WA_ACCESS_TOKEN" in data:
        assert "****" in data["WA_ACCESS_TOKEN"] or data["WA_ACCESS_TOKEN"].count("*") > 0


def test_get_settings_without_client_id(app_client, db):
    user_no_client = User(
        email="no_client_settings@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=None
    )
    db.add(user_no_client)
    db.commit()
    token = create_access_token({"sub": user_no_client.email, "role": user_no_client.role})
    resp = app_client.get("/api/settings/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400


def test_get_settings_unauthenticated(app_client, client_obj):
    resp = app_client.get("/api/settings/", headers={"X-Client-ID": str(client_obj.id)})
    assert resp.status_code == 401


# -- POST /settings -----------------------------------------------------------

@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_update_settings_success(mock_ws, app_client, auth_headers):
    resp = app_client.post(
        "/api/settings/",
        json={"settings": {"CHATWOOT_API_URL": "https://new.chatwoot.com", "APP_NAME": "NewApp"}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "atualizadas" in resp.json()["message"].lower()


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_update_settings_ignores_disallowed_keys(mock_ws, app_client, auth_headers):
    resp = app_client.post(
        "/api/settings/",
        json={"settings": {"UNKNOWN_KEY": "value", "APP_NAME": "Test"}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # Only APP_NAME should be saved (UNKNOWN_KEY ignored)
    assert "1 configurações" in resp.json()["message"]


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_update_settings_without_client_id(mock_ws, app_client, db):
    user_no_client = User(
        email="no_client_update@test.com",
        hashed_password=get_password_hash("pass"),
        role="admin",
        is_active=True,
        client_id=None
    )
    db.add(user_no_client)
    db.commit()
    token = create_access_token({"sub": user_no_client.email, "role": user_no_client.role})
    resp = app_client.post(
        "/api/settings/",
        json={"settings": {"APP_NAME": "Test"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_update_settings_syncs_client_name(mock_ws, app_client, auth_headers, db, client_obj):
    resp = app_client.post(
        "/api/settings/",
        json={"settings": {"CLIENT_NAME": "Novo Nome"}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    db.refresh(client_obj)
    assert client_obj.name == "Novo Nome"


def test_fetch_chat_logs_query_success(app_client, auth_headers, db, client_obj):
    from models import ChatConversation, ChatMessage
    from datetime import datetime, timezone

    convo = ChatConversation(
        client_id=client_obj.id,
        phone="5511999990000",
        contact_name="Lead Logs Test",
        status="open"
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)

    msg = ChatMessage(
        conversation_id=convo.id,
        sender_type="contact",
        message_type="text",
        content="Olá teste",
        timestamp=datetime.now(timezone.utc),
        agentflow_webhook_status="success"
    )
    db.add(msg)
    db.commit()

    resp = app_client.get("/api/settings/chat-logs?skip=0&limit=20", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["total"] == 1
    assert data["items"][0]["content"] == "Olá teste"
    # O hook after_insert de ChatMessage define "not_configured" quando CHAT_MESSAGES_WEBHOOK_URL não está configurado
    assert data["items"][0]["status"] == "not_configured"


def test_update_profile_empty_password_allowed(app_client, auth_headers):
    # Enviar senha vazia não deve disparar erro 422 de min_length
    resp = app_client.put(
        "/api/auth/me",
        json={"full_name": "Nome Atualizado", "password": ""},
        headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["full_name"] == "Nome Atualizado"


def test_update_profile_short_password_rejected(app_client, auth_headers):
    # Enviar senha com menos de 12 caracteres deve falhar com 400 ou 422
    resp = app_client.put(
        "/api/auth/me",
        json={"password": "123456"},
        headers=auth_headers
    )
    assert resp.status_code in (400, 422)


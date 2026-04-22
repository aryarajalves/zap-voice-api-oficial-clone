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


def test_get_settings_without_client_id(app_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    resp = app_client.get("/api/settings/", headers=headers)
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
def test_update_settings_without_client_id(mock_ws, app_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    resp = app_client.post(
        "/api/settings/",
        json={"settings": {"APP_NAME": "Test"}},
        headers=headers,
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

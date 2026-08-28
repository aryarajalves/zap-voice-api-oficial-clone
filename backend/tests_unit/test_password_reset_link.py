import pytest
import os
import sys
from unittest.mock import AsyncMock, patch
from datetime import datetime, timedelta, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, PasswordResetToken
from core.security import get_password_hash, verify_password, create_access_token
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
    session.query(PasswordResetToken).delete()
    session.query(User).delete()
    session.query(Client).delete()
    session.commit()
    yield session
    session.close()

@pytest.fixture
def client_app(db):
    from main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with patch("worker.start_worker", new_callable=AsyncMock), \
         patch("rabbitmq_client.RabbitMQClient.connect", new_callable=AsyncMock):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()

@pytest.fixture
def super_admin(db):
    client = Client(name="TestClient_Reset")
    db.add(client)
    db.commit()
    user = User(
        email="admin_reset@test.com",
        hashed_password=get_password_hash("admin123456!"),
        full_name="Admin Reset",
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


def test_create_reset_password_link_success(client_app, auth_headers, db):
    test_user = User(
        email="reset_target@teste.com",
        hashed_password=get_password_hash("OldPassword123!"),
        full_name="Target User",
        role="user",
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    resp = client_app.post(
        f"/api/auth/users/{test_user.id}/reset-password-link",
        json={"validity_hours": 24},
        headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user_id"] == test_user.id
    assert data["email"] == "reset_target@teste.com"

    tok = db.query(PasswordResetToken).filter(PasswordResetToken.token == data["token"]).first()
    assert tok is not None
    assert tok.is_used is False
    assert tok.user_id == test_user.id


def test_create_reset_password_link_user_not_found(client_app, auth_headers):
    resp = client_app.post(
        "/api/auth/users/99999/reset-password-link",
        json={"validity_hours": 24},
        headers=auth_headers
    )
    assert resp.status_code == 404
    assert "não encontrado" in resp.json()["detail"]


def test_verify_reset_password_token_valid(client_app, db):
    test_user = User(
        email="verify_token@teste.com",
        hashed_password=get_password_hash("OldPassword123!"),
        full_name="Verify User",
        role="user",
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    tok = PasswordResetToken(
        token="valid-reset-token-xyz",
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        is_used=False
    )
    db.add(tok)
    db.commit()

    resp = client_app.get("/api/auth/reset-password-token/valid-reset-token-xyz")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["email"] == "verify_token@teste.com"
    assert data["full_name"] == "Verify User"


def test_verify_reset_password_token_expired_and_used(client_app, db):
    test_user = User(
        email="expired_used@teste.com",
        hashed_password=get_password_hash("OldPassword123!"),
        full_name="Expired User",
        role="user",
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    expired_tok = PasswordResetToken(
        token="expired-token-123",
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        is_used=False
    )
    used_tok = PasswordResetToken(
        token="used-token-123",
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_used=True
    )
    db.add(expired_tok)
    db.add(used_tok)
    db.commit()

    resp_exp = client_app.get("/api/auth/reset-password-token/expired-token-123")
    assert resp_exp.status_code == 400
    assert "expirou" in resp_exp.json()["detail"]

    resp_used = client_app.get("/api/auth/reset-password-token/used-token-123")
    assert resp_used.status_code == 400
    assert "utilizado" in resp_used.json()["detail"]


def test_execute_reset_password_by_token_flow(client_app, db):
    test_user = User(
        email="exec_reset@teste.com",
        hashed_password=get_password_hash("OldPassword123!"),
        full_name="Exec User",
        role="user",
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    tok = PasswordResetToken(
        token="exec-token-valid-789",
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        is_used=False
    )
    db.add(tok)
    db.commit()

    resp_mismatch = client_app.post(
        "/api/auth/reset-password-token/exec-token-valid-789",
        json={
            "password": "NewStrongPass@2026!",
            "confirm_password": "DifferentPass@2026!"
        }
    )
    assert resp_mismatch.status_code == 400
    assert "não coincidem" in resp_mismatch.json()["detail"]

    resp_weak = client_app.post(
        "/api/auth/reset-password-token/exec-token-valid-789",
        json={
            "password": "Short1!",
            "confirm_password": "Short1!"
        }
    )
    assert resp_weak.status_code == 422 or resp_weak.status_code == 400

    resp_success = client_app.post(
        "/api/auth/reset-password-token/exec-token-valid-789",
        json={
            "password": "NewStrongPass@2026!",
            "confirm_password": "NewStrongPass@2026!"
        }
    )
    assert resp_success.status_code == 200
    assert "sucesso" in resp_success.json()["message"]

    db.refresh(test_user)
    assert verify_password("NewStrongPass@2026!", test_user.hashed_password) is True

    db.refresh(tok)
    assert tok.is_used is True

    resp_reuse = client_app.post(
        "/api/auth/reset-password-token/exec-token-valid-789",
        json={
            "password": "AnotherPass@2026!",
            "confirm_password": "AnotherPass@2026!"
        }
    )
    assert resp_reuse.status_code == 400

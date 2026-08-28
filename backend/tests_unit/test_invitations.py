import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Usa banco de dados em memória nos testes
os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base
from models import User, Client, UserInvitation
from core.security import get_password_hash, create_access_token
from core.deps import get_db
from datetime import datetime, timedelta, timezone

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
    # Limpar tabelas antes de cada teste
    session.query(UserInvitation).delete()
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
    client = Client(name="TestClient_Invite")
    db.add(client)
    db.commit()
    user = User(
        email="admin_invite@test.com",
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


# ── Testes de Convite ─────────────────────────────────────────────────────────

@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_create_invitation_success(mock_ws, client_app, auth_headers, db):
    # Criar cliente para o teste
    client1 = Client(name="Client One")
    client2 = Client(name="Client Two")
    db.add(client1)
    db.add(client2)
    db.commit()

    resp = client_app.post(
        "/api/auth/invitations",
        json={
            "validity_hours": 24,
            "role": "admin",
            "client_ids": [client1.id, client2.id]
        },
        headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["role"] == "admin"
    assert data["is_used"] is False
    assert len(data["client_ids"]) == 2
    assert client1.id in data["client_ids"]


def test_create_invitation_unauthorized(client_app):
    # Sem headers de autenticação deve retornar 401 ou 403
    resp = client_app.post(
        "/api/auth/invitations",
        json={
            "validity_hours": 24,
            "role": "admin"
        }
    )
    assert resp.status_code in [401, 403]


def test_get_invitation_valid(client_app, db):
    invite = UserInvitation(
        token="valid-token-123",
        role="premium",
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    db.add(invite)
    db.commit()

    resp = client_app.get("/api/auth/invitations/valid-token-123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["token"] == "valid-token-123"
    assert data["role"] == "premium"


def test_get_invitation_expired(client_app, db):
    invite = UserInvitation(
        token="expired-token-123",
        role="premium",
        is_used=False,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db.add(invite)
    db.commit()

    resp = client_app.get("/api/auth/invitations/expired-token-123")
    assert resp.status_code == 400
    assert "expirou" in resp.json()["detail"]


def test_get_invitation_used(client_app, db):
    invite = UserInvitation(
        token="used-token-123",
        role="premium",
        is_used=True
    )
    db.add(invite)
    db.commit()

    resp = client_app.get("/api/auth/invitations/used-token-123")
    assert resp.status_code == 400
    assert "utilizado" in resp.json()["detail"]


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_register_by_invitation_success(mock_ws, client_app, db):
    from models import EmailVerificationCode
    client = Client(name="Shared Client")
    db.add(client)
    db.commit()

    invite = UserInvitation(
        token="register-token-123",
        role="premium",
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    invite.accessible_clients.append(client)
    db.add(invite)

    # Inserir código de verificação válido
    code_record = EmailVerificationCode(
        email="convidado@teste.com",
        code="123456",
        token="register-token-123",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        is_used=False
    )
    db.add(code_record)
    db.commit()

    resp = client_app.post(
        "/api/auth/invitations/register-token-123/register",
        json={
            "full_name": "Convidado Teste",
            "email": "convidado@teste.com",
            "password": "SenhaSegura@2026!",
            "code": "123456"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "sucesso" in data["message"]

    # Validar se o usuário foi realmente criado
    user = db.query(User).filter(User.email == "convidado@teste.com").first()
    assert user is not None
    assert user.full_name == "Convidado Teste"
    assert user.role == "premium"
    assert len(user.accessible_clients) == 1
    assert user.accessible_clients[0].id == client.id

    # Validar se o convite foi marcado como utilizado
    db.refresh(invite)
    assert invite.is_used is True


@patch("websocket_manager.manager.broadcast", new_callable=AsyncMock)
def test_register_by_invitation_duplicate_email(mock_ws, client_app, db):
    invite = UserInvitation(
        token="token-dup-email",
        role="user",
        is_used=False
    )
    db.add(invite)
    
    # Criar um usuário já existente com o mesmo email
    existing_user = User(
        email="ja_existe@teste.com",
        hashed_password=get_password_hash("SenhaSegura@2026!"),
        role="user",
        is_active=True
    )
    db.add(existing_user)
    db.commit()

    resp = client_app.post(
        "/api/auth/invitations/token-dup-email/register",
        json={
            "full_name": "Novo Convidado",
            "email": "ja_existe@teste.com",
            "password": "SenhaSegura@2026!",
            "code": "123456"
        }
    )
    assert resp.status_code == 400
    assert "já está cadastrado" in resp.json()["detail"]


def test_list_invitations_success(client_app, auth_headers, db):
    # Criar convites no banco
    invite1 = UserInvitation(token="token-list-1", role="premium", is_used=False)
    invite2 = UserInvitation(token="token-list-2", role="user", is_used=True)
    db.add(invite1)
    db.add(invite2)
    db.commit()

    resp = client_app.get("/api/auth/invitations", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    tokens = [item["token"] for item in data]
    assert "token-list-1" in tokens
    assert "token-list-2" in tokens


def test_list_invitations_unauthorized(client_app):
    resp = client_app.get("/api/auth/invitations")
    assert resp.status_code in [401, 403]


def test_delete_invitation_success(client_app, auth_headers, db):
    invite = UserInvitation(token="token-to-delete", role="user", is_used=False)
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Deletar convite
    resp = client_app.delete(f"/api/auth/invitations/{invite.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "sucesso" in resp.json()["message"]

    # Validar se o convite foi removido
    deleted_invite = db.query(UserInvitation).filter(UserInvitation.id == invite.id).first()
    assert deleted_invite is None

    # Tentar acessar o token removido
    resp_get = client_app.get("/api/auth/invitations/token-to-delete")
    assert resp_get.status_code == 404


def test_delete_invitation_not_found(client_app, auth_headers):
    resp = client_app.delete("/api/auth/invitations/99999", headers=auth_headers)
    assert resp.status_code == 404


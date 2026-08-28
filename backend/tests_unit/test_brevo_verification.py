import pytest
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker, Session

from database import Base
from core.deps import get_db
from models import User, Client, UserInvitation, EmailVerificationCode
from core.security import get_password_hash, validate_password_strength
from services.brevo_service import generate_verification_email_html, send_verification_email

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
    session.query(EmailVerificationCode).delete()
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
         patch("rabbitmq_client.RabbitMQClient.connect", new_callable=AsyncMock), \
         patch("websocket_manager.manager.broadcast", new_callable=AsyncMock):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()


# ── Testes de Validação de Senha ──────────────────────────────────────────────

def test_validate_password_strength():
    # Menor que 12 caracteres
    valid, msg = validate_password_strength("Senha@123")
    assert not valid
    assert "12 caracteres" in msg

    # Sem letras
    valid, msg = validate_password_strength("123456789012@#$")
    assert not valid
    assert "letra" in msg

    # Sem números
    valid, msg = validate_password_strength("MinhaSenhaForteCom@!")
    assert not valid
    assert "número" in msg

    # Sem caractere especial
    valid, msg = validate_password_strength("MinhaSenhaForteCom123")
    assert not valid
    assert "especial" in msg

    # Senha válida completa
    valid, msg = validate_password_strength("MinhaSenha@2026!")
    assert valid
    assert msg == ""


# ── Testes do Serviço Brevo ───────────────────────────────────────────────────

def test_generate_verification_email_html():
    html = generate_verification_email_html("123456", "Arya Raj")
    assert "123 456" in html
    assert "Arya Raj" in html
    assert "ZapVoice" in html
    assert "15 minutos" in html

@pytest.mark.asyncio
async def test_send_verification_email_mock(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY", raising=False)
    result = await send_verification_email("teste@exemplo.com", "654321", "Usuário Teste")
    assert result["success"] is True
    assert result.get("mock") is True

@pytest.mark.asyncio
async def test_send_verification_email_invalid_email():
    result = await send_verification_email("email_invalido", "654321")
    assert result["success"] is False
    assert "inválido" in result["error"]


# ── Testes dos Endpoints de Convite e Verificação ──────────────────────────────

def test_send_code_and_register_flow(client_app, db: Session):
    token_str = "test-invite-token-brevo-flow"

    invite = UserInvitation(
        token=token_str,
        role="admin",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        is_used=False
    )
    db.add(invite)
    db.commit()

    # 1. Testar falha: senhas não coincidem
    res_mismatch = client_app.post(
        f"/api/auth/invitations/{token_str}/send-code",
        json={
            "full_name": "Novo Usuário",
            "email": "novo_usuario_brevo@exemplo.com",
            "password": "MinhaSenha@2026!",
            "confirm_password": "OutraSenha@2026!"
        }
    )
    assert res_mismatch.status_code == 400
    assert "não coincidem" in res_mismatch.json()["detail"]

    # 2. Testar falha: senha sem complexidade (sem número e caractere especial, >= 12 chars)
    res_no_special = client_app.post(
        f"/api/auth/invitations/{token_str}/send-code",
        json={
            "full_name": "Novo Usuário",
            "email": "novo_usuario_brevo@exemplo.com",
            "password": "MinhaSenhaSemNumeroEspecial",
            "confirm_password": "MinhaSenhaSemNumeroEspecial"
        }
    )
    assert res_no_special.status_code == 400
    assert "número" in res_no_special.json()["detail"] or "especial" in res_no_special.json()["detail"]

    # 3. Testar falha: senha menor que 12 caracteres (Pydantic 422)
    res_weak = client_app.post(
        f"/api/auth/invitations/{token_str}/send-code",
        json={
            "full_name": "Novo Usuário",
            "email": "novo_usuario_brevo@exemplo.com",
            "password": "Senha@1",
            "confirm_password": "Senha@1"
        }
    )
    assert res_weak.status_code == 422

    # 3. Testar sucesso: envio de código
    res_send = client_app.post(
        f"/api/auth/invitations/{token_str}/send-code",
        json={
            "full_name": "Novo Usuário",
            "email": "novo_usuario_brevo@exemplo.com",
            "password": "MinhaSenha@2026!",
            "confirm_password": "MinhaSenha@2026!"
        }
    )
    assert res_send.status_code == 200
    assert "sucesso" in res_send.json()["message"]

    # Obter o código gerado no banco de dados
    code_record = db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == "novo_usuario_brevo@exemplo.com",
        EmailVerificationCode.token == token_str,
        EmailVerificationCode.is_used == False
    ).first()
    assert code_record is not None
    assert len(code_record.code) == 6

    # 4. Testar falha no registro com código errado
    res_wrong_code = client_app.post(
        f"/api/auth/invitations/{token_str}/register",
        json={
            "full_name": "Novo Usuário",
            "email": "novo_usuario_brevo@exemplo.com",
            "password": "MinhaSenha@2026!",
            "code": "000000"
        }
    )
    assert res_wrong_code.status_code == 400
    assert "incorreto" in res_wrong_code.json()["detail"]

    # 5. Testar sucesso no registro com código correto
    res_register = client_app.post(
        f"/api/auth/invitations/{token_str}/register",
        json={
            "full_name": "Novo Usuário",
            "email": "novo_usuario_brevo@exemplo.com",
            "password": "MinhaSenha@2026!",
            "code": code_record.code
        }
    )
    assert res_register.status_code == 200
    assert "ativada com sucesso" in res_register.json()["message"]

    # Verificar que o usuário foi criado e convite/código marcados como usados
    created_user = db.query(User).filter(User.email == "novo_usuario_brevo@exemplo.com").first()
    assert created_user is not None
    assert created_user.full_name == "Novo Usuário"

    db.refresh(invite)
    assert invite.is_used is True

    db.refresh(code_record)
    assert code_record.is_used is True

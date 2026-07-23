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
from models import User, Client, WebhookLead
from models.email import EmailConfig, EmailTemplate, EmailDispatch
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
    c = Client(name="EmailTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def test_user(db, client_obj):
    user = User(
        email="email_test@test.com",
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
    from rabbitmq_client import rabbitmq

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with patch.object(rabbitmq, "connect", new_callable=AsyncMock), \
         patch.object(rabbitmq, "consume", new_callable=AsyncMock), \
         patch.object(rabbitmq, "subscribe_events", new_callable=AsyncMock), \
         patch.object(rabbitmq, "publish", new_callable=AsyncMock), \
         patch.object(rabbitmq, "publish_event", new_callable=AsyncMock):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()


# =========================================================================
# Testes de Configuração de E-mail
# =========================================================================

def test_get_email_config_not_configured(app_client, auth_headers):
    """Deve retornar configured=False quando não há config cadastrada."""
    resp = app_client.get("/api/email/config", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False


def test_save_and_get_email_config_ses(app_client, auth_headers):
    """Deve salvar e recuperar configuração de Amazon SES com sucesso."""
    payload = {
        "provider": "ses",
        "aws_access_key_id": "AKIA1234567890",
        "aws_secret_access_key": "SECRETKEY1234567890",
        "aws_region": "us-east-1",
        "from_email": "contato@empresa.com",
        "from_name": "ZapVoice Teste"
    }
    resp_save = app_client.post("/api/email/config", json=payload, headers=auth_headers)
    assert resp_save.status_code == 200
    assert resp_save.json()["status"] == "success"

    # Verificar que foi salva
    resp_get = app_client.get("/api/email/config", headers=auth_headers)
    assert resp_get.status_code == 200
    data = resp_get.json()
    assert data["configured"] is True
    assert data["config"]["provider"] == "ses"
    assert data["config"]["from_email"] == "contato@empresa.com"
    assert data["config"]["has_aws_secret"] is True


def test_save_email_config_resend(app_client, auth_headers):
    """Deve salvar configuração de Resend com sucesso."""
    payload = {
        "provider": "resend",
        "resend_api_key": "re_TestResendApiKey123",
        "from_email": "noreply@empresa.com",
        "from_name": "Empresa"
    }
    resp = app_client.post("/api/email/config", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"


def test_save_email_config_smtp(app_client, auth_headers):
    """Deve salvar configuração de SMTP customizado com sucesso."""
    payload = {
        "provider": "smtp",
        "smtp_host": "smtp.empresa.com",
        "smtp_port": 587,
        "smtp_user": "mailer@empresa.com",
        "smtp_password": "senha_smtp_secreta",
        "smtp_encryption": "tls",
        "from_email": "noreply@empresa.com",
        "from_name": "Empresa"
    }
    resp = app_client.post("/api/email/config", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"


# =========================================================================
# Testes de Templates de E-mail
# =========================================================================

def test_list_templates_empty(app_client, auth_headers):
    """Deve retornar lista vazia quando não há templates."""
    resp = app_client.get("/api/email/templates", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_create_email_template(app_client, auth_headers):
    """Deve criar um template de e-mail com sucesso."""
    payload = {
        "name": "Template Teste CRUD",
        "subject": "Olá {{nome}}, seu acesso chegou!",
        "body_html": "<h1>Olá {{nome}},</h1><p>Bem-vindo(a)!</p>"
    }
    resp = app_client.post("/api/email/templates", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Template Teste CRUD"
    assert data["subject"] == "Olá {{nome}}, seu acesso chegou!"
    assert "id" in data


def test_update_email_template(app_client, auth_headers):
    """Deve criar e depois atualizar um template."""
    # Criar template
    create_payload = {
        "name": "Template Para Editar",
        "subject": "Assunto Original",
        "body_html": "<p>Conteúdo original</p>"
    }
    resp_create = app_client.post("/api/email/templates", json=create_payload, headers=auth_headers)
    assert resp_create.status_code == 200
    template_id = resp_create.json()["id"]

    # Atualizar
    update_payload = {
        "name": "Template Editado",
        "subject": "Novidades para {{nome}}!",
        "body_html": "<p>Conteúdo atualizado para {{nome}}</p>"
    }
    resp_update = app_client.put(f"/api/email/templates/{template_id}", json=update_payload, headers=auth_headers)
    assert resp_update.status_code == 200
    assert resp_update.json()["name"] == "Template Editado"
    assert resp_update.json()["subject"] == "Novidades para {{nome}}!"


def test_delete_email_template(app_client, auth_headers):
    """Deve criar e excluir (soft delete) um template."""
    # Criar
    create_payload = {
        "name": "Template Para Deletar",
        "subject": "Assunto Deletar",
        "body_html": "<p>Conteúdo a deletar</p>"
    }
    resp_create = app_client.post("/api/email/templates", json=create_payload, headers=auth_headers)
    assert resp_create.status_code == 200
    template_id = resp_create.json()["id"]

    # Deletar
    resp_del = app_client.delete(f"/api/email/templates/{template_id}", headers=auth_headers)
    assert resp_del.status_code == 200
    assert resp_del.json()["status"] == "success"


# =========================================================================
# Testes de Disparo em Massa e Histórico
# =========================================================================

def test_send_bulk_without_email_config_returns_error(app_client, auth_headers, db, client_obj):
    """Deve retornar erro quando não há configuração de e-mail."""
    # Criar um template válido
    tmpl = EmailTemplate(
        client_id=client_obj.id,
        name="Template Sem Config",
        subject="Assunto Sem Config",
        body_html="<p>Conteúdo</p>"
    )
    db.add(tmpl)
    db.commit()

    payload = {
        "template_id": tmpl.id,
        "title": "Campanha Sem Config",
        "tag_name": ""
    }
    resp = app_client.post("/api/email/send-bulk", json=payload, headers=auth_headers)
    # Sem config de e-mail, deve retornar erro (400)
    assert resp.status_code in [400, 422, 500]


def test_send_bulk_with_smtp_config_filters_by_tag(app_client, auth_headers, db, client_obj):
    """Deve disparar apenas para leads com etiqueta correta e e-mail válido."""
    # Configurar e-mail SMTP (para não tentar conexão real, vai ser mockado)
    cfg = EmailConfig(
        client_id=client_obj.id,
        provider="smtp",
        smtp_host="localhost",
        smtp_port=25,
        from_email="noreply@test.com",
        from_name="Test"
    )
    db.add(cfg)

    # Criar template
    tmpl = EmailTemplate(
        client_id=client_obj.id,
        name="Template Bulk Filter",
        subject="Filtro de Campanha {{nome}}",
        body_html="<p>Olá {{nome}}</p>"
    )
    db.add(tmpl)

    # Leads: 2 com etiqueta correta + e-mail, 1 sem e-mail, 1 com outra etiqueta
    lead1 = WebhookLead(
        client_id=client_obj.id,
        phone="5511900000001",
        name="Lead Válido Um",
        email="valid1@test.com",
        tags="promo"
    )
    lead2 = WebhookLead(
        client_id=client_obj.id,
        phone="5511900000002",
        name="Lead Válido Dois",
        email="valid2@test.com",
        tags="promo"
    )
    lead_sem_email = WebhookLead(
        client_id=client_obj.id,
        phone="5511900000003",
        name="Lead Sem Email",
        email=None,
        tags="promo"
    )
    lead_outra_tag = WebhookLead(
        client_id=client_obj.id,
        phone="5511900000004",
        name="Lead Outra Tag",
        email="other@test.com",
        tags="outra"
    )
    db.add_all([lead1, lead2, lead_sem_email, lead_outra_tag])
    db.commit()

    payload = {
        "template_id": tmpl.id,
        "title": "Campanha Filtrada por Tag",
        "tag_name": "promo"
    }

    with patch("routers.email_marketing.send_single_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = {"success": True, "message_id": "msg_001"}
        resp = app_client.post("/api/email/send-bulk", json=payload, headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    # 2 leads com "promo" + e-mail válido (lead_sem_email excluído por falta de e-mail)
    assert data["total_sent"] == 2
    assert data["total_failed"] == 0
    # Verificar que a função de envio foi chamada 2 vezes
    assert mock_send.call_count == 2


def test_send_bulk_all_contacts_without_tag(app_client, auth_headers, db, client_obj):
    """Deve disparar para todos os contatos com e-mail quando tag_name está vazio."""
    # Configurar e-mail
    cfg = EmailConfig(
        client_id=client_obj.id,
        provider="smtp",
        smtp_host="localhost",
        smtp_port=25,
        from_email="noreply2@test.com",
        from_name="Test2"
    )
    db.add(cfg)

    # Template
    tmpl = EmailTemplate(
        client_id=client_obj.id,
        name="Template Para Todos",
        subject="Para Todos",
        body_html="<p>Olá geral</p>"
    )
    db.add(tmpl)

    # Criar 3 leads com e-mail (etiquetas variadas)
    for i in range(3):
        lead = WebhookLead(
            client_id=client_obj.id,
            phone=f"551190000100{i}",
            name=f"Lead Geral {i}",
            email=f"geral{i}@test.com",
            tags=f"tag{i}"
        )
        db.add(lead)
    db.commit()

    payload = {
        "template_id": tmpl.id,
        "title": "Campanha Geral",
        "tag_name": ""  # Sem filtro = todos os contatos
    }

    with patch("routers.email_marketing.send_single_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = {"success": True, "message_id": "msg_all"}
        resp = app_client.post("/api/email/send-bulk", json=payload, headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    # Deve ter enviado pelo menos para os 3 leads recém-criados
    assert data["total_sent"] >= 3


def test_email_history_returns_list(app_client, auth_headers, db, client_obj):
    """Deve retornar lista do histórico (mesmo que vazia inicialmente)."""
    resp = app_client.get("/api/email/history", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_email_history_after_dispatch_contains_record(app_client, auth_headers, db, client_obj):
    """Deve conter o registro no histórico após um disparo."""
    # Setup: config + template + lead
    cfg = EmailConfig(
        client_id=client_obj.id,
        provider="smtp",
        smtp_host="localhost",
        smtp_port=25,
        from_email="hist@test.com",
        from_name="Hist"
    )
    db.add(cfg)
    tmpl = EmailTemplate(
        client_id=client_obj.id,
        name="Template Historico",
        subject="Historico Teste",
        body_html="<p>Historico</p>"
    )
    db.add(tmpl)
    lead = WebhookLead(
        client_id=client_obj.id,
        phone="5511900005000",
        name="Lead Historico",
        email="hist@email.com",
        tags="hist_tag"
    )
    db.add(lead)
    db.commit()

    payload = {
        "template_id": tmpl.id,
        "title": "Campanha Historico Test",
        "tag_name": "hist_tag"
    }

    with patch("routers.email_marketing.send_single_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = {"success": True, "message_id": "hist_msg"}
        app_client.post("/api/email/send-bulk", json=payload, headers=auth_headers)

    # Verificar histórico
    resp_hist = app_client.get("/api/email/history", headers=auth_headers)
    assert resp_hist.status_code == 200
    history = resp_hist.json()
    assert len(history) >= 1

    campanha = next((h for h in history if h.get("title") == "Campanha Historico Test"), None)
    assert campanha is not None
    assert campanha["total_sent"] == 1
    assert campanha["status"] == "completed"

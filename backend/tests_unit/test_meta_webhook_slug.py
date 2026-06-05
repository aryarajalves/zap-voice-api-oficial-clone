import pytest
import os
import sys
from unittest.mock import AsyncMock, patch
import models
from models import AppConfig, Client

# Define DATABASE_URL ANTES de qualquer import do projeto para conftest
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "testsecretkeyhereforvalidation_zapvoice_2026"

def test_meta_webhook_global_verification(client, db_session):
    # Assegurar que o cliente padrão ID 1 exista
    client_obj = db_session.query(Client).filter(Client.id == 1).first()
    if not client_obj:
        client_obj = Client(id=1, name="DefaultClient")
        db_session.add(client_obj)
        db_session.commit()
    
    # Adicionar verify token padrão
    cfg_token = AppConfig(client_id=1, key="WHATSAPP_VERIFY_TOKEN", value="zapvoice_oficial")
    db_session.add(cfg_token)
    db_session.commit()

    # GET /api/meta sem slug (padrão)
    resp = client.get("/api/meta?hub.mode=subscribe&hub.verify_token=zapvoice_oficial&hub.challenge=test_challenge")
    assert resp.status_code == 200
    assert resp.text == "test_challenge"

def test_meta_webhook_slug_not_found(client):
    # GET /api/meta/invalid_slug deve retornar 404
    resp = client.get("/api/meta/invalid_slug?hub.mode=subscribe&hub.verify_token=zapvoice_oficial&hub.challenge=test")
    assert resp.status_code == 404

def test_meta_webhook_slug_verification_success(client, db_session):
    # Criar um cliente novo
    client_obj = Client(name="SlugWebhookClient")
    db_session.add(client_obj)
    db_session.commit()
    db_session.refresh(client_obj)

    # Configurar slug e token específico para o cliente no banco
    cfg_slug = AppConfig(client_id=client_obj.id, key="WA_WEBHOOK_SLUG", value="meta_slug_teste")
    cfg_token = AppConfig(client_id=client_obj.id, key="WHATSAPP_VERIFY_TOKEN", value="token_secreto_cliente")
    db_session.add(cfg_slug)
    db_session.add(cfg_token)
    db_session.commit()

    # GET /api/meta/meta_slug_teste com token do cliente deve passar
    resp = client.get("/api/meta/meta_slug_teste?hub.mode=subscribe&hub.verify_token=token_secreto_cliente&hub.challenge=challenge123")
    assert resp.status_code == 200
    assert resp.text == "challenge123"

def test_meta_webhook_slug_post_event(client, db_session):
    # Criar um cliente novo
    client_obj = Client(name="SlugWebhookClientPost")
    db_session.add(client_obj)
    db_session.commit()
    db_session.refresh(client_obj)

    cfg_slug = AppConfig(client_id=client_obj.id, key="WA_WEBHOOK_SLUG", value="meta_slug_teste_post")
    db_session.add(cfg_slug)
    db_session.commit()

    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "123456",
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "5511999999999", "phone_number_id": "100000000"},
                    "messages": [{
                        "from": "5511999999999",
                        "id": "wamid.HBgNNTUxMTk5OTk5OTk5OQ==",
                        "timestamp": "1672531199",
                        "text": {"body": "Olá"},
                        "type": "text"
                    }]
                }
            }]
        }]
    }

    from rabbitmq_client import rabbitmq
    with patch.object(rabbitmq, "publish", new_callable=AsyncMock) as mock_publish:
        resp = client.post("/api/meta/meta_slug_teste_post", json=payload)
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
        
        assert mock_publish.called
        called_args = mock_publish.call_args[0]
        assert called_args[0] == "whatsapp_events"
        assert called_args[1]["client_id"] == client_obj.id


def test_settings_update_slug_invalid_format(client, db_session):
    """Deve rejeitar slug com caracteres inválidos (maiúsculas, espaços, etc.)"""
    from models import Client, User
    import bcrypt

    client_obj = db_session.query(Client).filter(Client.id == 1).first()
    if not client_obj:
        client_obj = Client(id=1, name="DefaultClient")
        db_session.add(client_obj)

    hashed = bcrypt.hashpw(b"testpass", bcrypt.gensalt()).decode()
    user = User(email="admin_slug_inv@test.com", hashed_password=hashed, role="super_admin", client_id=1, is_active=True)
    db_session.add(user)
    db_session.commit()

    login_resp = client.post("/api/auth/token",
        data={"username": "admin_slug_inv@test.com", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": "1"}

    resp = client.post("/api/settings/", json={"settings": {"WA_WEBHOOK_SLUG": "Meu Slug Inválido!"}}, headers=headers)
    assert resp.status_code == 400
    assert "Slug inválido" in resp.json()["detail"]


def test_settings_update_slug_conflict(client, db_session):
    """Deve rejeitar slug que já está sendo usado por outro cliente"""
    from models import Client, User, AppConfig
    import bcrypt

    c1 = db_session.query(Client).filter(Client.id == 1).first()
    if not c1:
        c1 = Client(id=1, name="Client1")
        db_session.add(c1)

    c2 = Client(name="Client2Conflict")
    db_session.add(c2)
    db_session.commit()
    db_session.refresh(c2)

    slug_cfg = AppConfig(client_id=c2.id, key="WA_WEBHOOK_SLUG", value="slug_existente_conflict")
    db_session.add(slug_cfg)

    hashed = bcrypt.hashpw(b"testpass", bcrypt.gensalt()).decode()
    user = User(email="admin_slug_conf@test.com", hashed_password=hashed, role="super_admin", client_id=1, is_active=True)
    db_session.add(user)
    db_session.commit()

    login_resp = client.post("/api/auth/token",
        data={"username": "admin_slug_conf@test.com", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": "1"}

    resp = client.post("/api/settings/", json={"settings": {"WA_WEBHOOK_SLUG": "slug_existente_conflict"}}, headers=headers)
    assert resp.status_code == 409
    assert "já está sendo utilizado" in resp.json()["detail"]


def test_settings_update_slug_own_slug_allowed(client, db_session):
    """Deve permitir que o cliente salve o mesmo slug que já possui (sem conflito consigo mesmo)"""
    from models import Client, User, AppConfig
    import bcrypt

    c1 = db_session.query(Client).filter(Client.id == 1).first()
    if not c1:
        c1 = Client(id=1, name="Client1")
        db_session.add(c1)
    db_session.commit()

    slug_cfg = AppConfig(client_id=1, key="WA_WEBHOOK_SLUG", value="meu_proprio_slug_own")
    db_session.add(slug_cfg)

    hashed = bcrypt.hashpw(b"testpass2", bcrypt.gensalt()).decode()
    user = User(email="admin_slug_own@test.com", hashed_password=hashed, role="super_admin", client_id=1, is_active=True)
    db_session.add(user)
    db_session.commit()

    login_resp = client.post("/api/auth/token",
        data={"username": "admin_slug_own@test.com", "password": "testpass2"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": "1"}

    resp = client.post("/api/settings/", json={"settings": {"WA_WEBHOOK_SLUG": "meu_proprio_slug_own"}}, headers=headers)
    assert resp.status_code == 200

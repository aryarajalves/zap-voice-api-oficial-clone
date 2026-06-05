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

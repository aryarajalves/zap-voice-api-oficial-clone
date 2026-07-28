import sys
import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test_secret_key_1234567890_super_long_32chars"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from main import app
from database import Base, engine, SessionLocal
import models
from core.deps import get_current_user

# Criar tabelas para o teste
Base.metadata.create_all(bind=engine)

def mock_get_current_user():
    user = MagicMock()
    user.id = 1
    user.client_id = 1
    user.email = "admin@zapvoice.com"
    return user

app.dependency_overrides[get_current_user] = mock_get_current_user
client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Criar cliente de teste
    c = db.query(models.Client).filter_by(id=1).first()
    if not c:
        c = models.Client(id=1, name="Cliente Teste")
        db.add(c)
        db.commit()
    db.close()

def test_inbound_webhook_and_list():
    # 1. Enviar um webhook de resposta recebida
    payload = {
        "from_email": "lead_resposta@teste.com",
        "from_name": "João Resposta",
        "to_email": "contato@zapvoice.com",
        "subject": "Re: Seu e-mail de oferta",
        "body_text": "Gostei da oferta, como faço para comprar?",
        "provider": "resend"
    }

    res = client.post("/api/email/inbound-webhook", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    inbound_id = data["id"]

    # 2. Listar respostas de e-mail na API do cliente
    headers = {"X-Client-ID": "1"}
    res_list = client.get("/api/email/inbounds", headers=headers)
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert "items" in list_data
    assert list_data["total_unread"] >= 1

    found = False
    for item in list_data["items"]:
        if item["id"] == inbound_id:
            found = True
            assert item["from_email"] == "lead_resposta@teste.com"
            assert item["is_read"] is False
    assert found is True

    # 3. Marcar como lida
    res_read = client.put(f"/api/email/inbounds/{inbound_id}/read", headers=headers)
    assert res_read.status_code == 200
    assert res_read.json()["status"] == "success"

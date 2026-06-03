import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_whatsapp_templates_requires_auth():
    # Rota mantida no whatsapp.py
    response = client.get("/api/whatsapp/templates")
    # Deve requerer autenticação (retorna 401 Unauthorized ou similar)
    assert response.status_code in [401, 403]

def test_whatsapp_profile_requires_auth():
    # Rota extraída para whatsapp_profile.py
    response = client.get("/api/whatsapp/profile")
    # Deve requerer autenticação (retorna 401 Unauthorized ou similar)
    assert response.status_code in [401, 403]

def test_whatsapp_assistant_chat_requires_auth():
    # Rota de assistente extraída para whatsapp_profile.py
    response = client.post("/api/whatsapp/assistant/chat", json={"messages": []})
    assert response.status_code in [401, 403]

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_chat_conversations_requires_auth():
    response = client.get("/api/chat/conversations")
    assert response.status_code in [401, 403]

def test_chat_messages_requires_auth():
    response = client.get("/api/chat/conversations/1/messages")
    assert response.status_code in [401, 403]

def test_chat_send_message_requires_auth():
    response = client.post("/api/chat/conversations/1/messages", json={"content": "Oi"})
    assert response.status_code in [401, 403]

def test_chat_labels_requires_auth():
    response = client.post("/api/chat/conversations/1/labels", json={"labels": ["teste"]})
    assert response.status_code in [401, 403]

def test_chat_status_requires_auth():
    response = client.post("/api/chat/conversations/1/status", json={"status": "resolved"})
    assert response.status_code in [401, 403]

def test_list_chat_labels_requires_auth():
    response = client.get("/api/chat/labels")
    assert response.status_code in [401, 403]

def test_proxy_whatsapp_media_requires_auth_or_token():
    # Sem token deve dar 401
    response = client.get("/api/chat/media/123?client_id=1")
    assert response.status_code == 401

def test_upload_audio_requires_auth():
    """Teste: Endpoint /api/upload usado pelo gravador de áudio exige autenticação."""
    import io
    fake_audio = io.BytesIO(b"fake audio data")
    response = client.post(
        "/api/upload",
        files={"file": ("audio_test.webm", fake_audio, "audio/webm")}
    )
    assert response.status_code in [401, 403]

def test_send_media_requires_auth():
    response = client.post("/api/chat/conversations/1/media")
    assert response.status_code in [401, 403]

def test_pin_conversation_requires_auth():
    response = client.post("/api/chat/conversations/1/pin", json={"pinned": True})
    assert response.status_code in [401, 403]

def test_note_conversation_requires_auth():
    response = client.post("/api/chat/conversations/1/note", json={"private_note": "Nota teste"})
    assert response.status_code in [401, 403]

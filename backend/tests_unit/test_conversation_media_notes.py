import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from datetime import datetime, timezone
import models
from main import app
from core.deps import get_db, get_current_user
from routers.chat.common import get_client_id

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

def mock_get_current_user():
    return mock_user

def mock_get_client_id():
    return 1

@pytest.mark.asyncio
async def test_list_conversation_media_includes_notes_and_excludes_deleted(client, db_session):
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_client_id] = mock_get_client_id

    try:
        # Criar uma conversa de teste
        convo = models.ChatConversation(
            client_id=1,
            contact_name="Lead Notas Teste",
            phone="5511999998888",
            status="open",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(convo)
        db_session.commit()
        db_session.refresh(convo)

        # 1. Adicionar mídia normal
        msg_media = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="contact",
            message_type="image",
            media_url="https://example.com/foto.jpg",
            content="Olha a foto",
            timestamp=datetime.now(timezone.utc)
        )
        # 2. Adicionar uma anotação privada ativa
        msg_note1 = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="system",
            user_id=1,
            message_type="text",
            content="🔒 Anotação Privada: Cliente quer proposta até amanhã",
            timestamp=datetime.now(timezone.utc)
        )
        # 3. Adicionar uma segunda anotação privada ativa
        msg_note2 = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="system",
            user_id=1,
            message_type="text",
            content="🔒 Anotação Privada: Prefere contato após 14h",
            timestamp=datetime.now(timezone.utc)
        )
        # 4. Adicionar anotação que depois será apagada
        msg_note_deleted = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="system",
            user_id=1,
            message_type="text",
            content="🔒 Anotação Privada: Nota temporária que será apagada",
            timestamp=datetime.now(timezone.utc)
        )
        # 5. Mensagem com link
        msg_link = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="user",
            message_type="text",
            content="Veja nosso site em https://zapvoice.com.br",
            timestamp=datetime.now(timezone.utc)
        )

        db_session.add_all([msg_media, msg_note1, msg_note2, msg_note_deleted, msg_link])
        db_session.commit()

        # Apagar a msg_note_deleted do banco para simular que foi excluída do chat
        db_session.delete(msg_note_deleted)
        db_session.commit()

        # Chamar o endpoint /chat/conversations/{id}/media-and-docs
        response = client.get(
            f"/api/chat/conversations/{convo.id}/media-and-docs",
            headers={"X-Client-Id": "1"}
        )
        assert response.status_code == 200
        data = response.json()

        # Validações
        assert data["total_media"] == 1
        assert data["total_docs"] == 0
        assert data["total_links"] == 1
        assert data["total_notes"] == 2
        assert data["total_all"] == 4  # 1 media + 0 docs + 1 link + 2 notes

        # Validar as anotações retornadas
        assert len(data["notes"]) == 2
        note_contents = [n["content"] for n in data["notes"]]
        assert "Cliente quer proposta até amanhã" in note_contents
        assert "Prefere contato após 14h" in note_contents
        assert "Nota temporária que será apagada" not in note_contents

        # Validar campos de cada anotação
        first_note = data["notes"][0]
        assert "id" in first_note
        assert "message_id" in first_note
        assert "content" in first_note
        assert "timestamp" in first_note
        assert first_note["sender_type"] == "system"

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_client_id, None)

@pytest.mark.asyncio
async def test_delete_private_note_via_message_endpoint_removes_from_media(client, db_session):
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_client_id] = mock_get_client_id

    try:
        # 1. Criar conversa
        convo = models.ChatConversation(
            client_id=1,
            contact_name="Lead Delete Test",
            phone="5511988887777",
            status="open",
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(convo)
        db_session.commit()
        db_session.refresh(convo)

        # 2. Criar duas anotações
        note1 = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="system",
            user_id=1,
            message_type="text",
            content="🔒 Anotação Privada: Primeira anotação teste",
            timestamp=datetime.now(timezone.utc)
        )
        note2 = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="system",
            user_id=1,
            message_type="text",
            content="🔒 Anotação Privada: Segunda anotação teste",
            timestamp=datetime.now(timezone.utc)
        )
        db_session.add_all([note1, note2])
        db_session.commit()
        db_session.refresh(note1)
        db_session.refresh(note2)

        # 3. Validar que ambas aparecem no media
        res_before = client.get(
            f"/api/chat/conversations/{convo.id}/media-and-docs",
            headers={"X-Client-Id": "1"}
        )
        assert res_before.status_code == 200
        assert res_before.json()["total_notes"] == 2

        # 4. Deletar a primeira anotação via endpoint DELETE
        del_res = client.delete(
            f"/api/chat/conversations/{convo.id}/messages/{note1.id}",
            headers={"X-Client-Id": "1"}
        )
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # 5. Buscar media novamente e validar que resta apenas a segunda
        res_after = client.get(
            f"/api/chat/conversations/{convo.id}/media-and-docs",
            headers={"X-Client-Id": "1"}
        )
        assert res_after.status_code == 200
        data_after = res_after.json()
        assert data_after["total_notes"] == 1
        assert len(data_after["notes"]) == 1
        assert data_after["notes"][0]["id"] == note2.id
        assert data_after["notes"][0]["content"] == "Segunda anotação teste"

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_client_id, None)


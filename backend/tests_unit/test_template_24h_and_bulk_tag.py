import pytest
from datetime import datetime, timedelta
import models
from core.deps import get_current_user
from main import app

def test_template_24h_filter_and_bulk_tag(db_session, client):
    # Mock do usuario autenticado
    mock_user = models.User(id=1, email="test@example.com", client_id=1, role="admin")
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        # 1. Criar conversa de teste
        convo = models.ChatConversation(
            client_id=1,
            phone="5511988887777",
            contact_name="Contato Teste 24h",
            status="open",
            labels=["existente"]
        )
        db_session.add(convo)
        db_session.commit()
        db_session.refresh(convo)

        # 2. Criar mensagem de template recente (últimas 24h)
        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="user",
            message_type="template",
            content="Mensagem de modelo enviada",
            timestamp=datetime.utcnow() - timedelta(hours=2)
        )
        db_session.add(msg)
        db_session.commit()

        # 3. Testar filtro de template_sent_24h_only no endpoint /chat/conversations
        res_filter = client.get(
            "/api/chat/conversations?template_sent_24h_only=true",
            headers={"X-Client-ID": "1"}
        )
        assert res_filter.status_code == 200
        data_filter = res_filter.json()
        assert any(c["id"] == convo.id for c in data_filter.get("conversations", []))

        # 4. Testar etiquetagem em massa /chat/conversations/bulk-tag
        res_tag = client.post(
            "/api/chat/conversations/bulk-tag",
            json={
                "labels": ["NovaEtiqueta24h"],
                "ids": [convo.id]
            },
            headers={"X-Client-ID": "1"}
        )
        assert res_tag.status_code == 200
        data_tag = res_tag.json()
        assert data_tag.get("status") == "ok"
        assert data_tag.get("updated_count") == 1

        # Refrescar do banco e validar se a etiqueta foi adicionada
        db_session.refresh(convo)
        assert "NovaEtiqueta24h" in convo.labels
        assert "existente" in convo.labels
    finally:
        app.dependency_overrides.pop(get_current_user, None)

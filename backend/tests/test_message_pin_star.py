import sys
import os
from datetime import datetime
import pytest
from unittest.mock import MagicMock

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///./test_msg_pin_star.db"
os.environ["SECRET_KEY"] = "test-secret-key-123456789012345678901234567890"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import models
from database import SessionLocal, engine
from routers.chat.message_actions_routes import (
    toggle_pin_message,
    toggle_star_message,
    list_starred_messages
)

models.Base.metadata.create_all(bind=engine)

@pytest.mark.asyncio
async def test_message_pin_and_star_workflow():
    db = SessionLocal()
    client_id = 888
    try:
        # Limpar dados
        db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id.in_([801, 802])).delete(synchronize_session=False)
        db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.client_id == client_id).delete(synchronize_session=False)
        db.query(models.Client).filter(models.Client.id == client_id).delete(synchronize_session=False)
        db.commit()

        client = models.Client(id=client_id, name="Test Client Pin Star")
        user = models.User(id=888, email="test_pin_star@example.com", client_id=client_id, role="admin")
        db.add_all([client, user])
        db.commit()

        now = datetime.utcnow()
        convo = models.ChatConversation(
            id=801, client_id=client_id, contact_name="Lead Teste", phone="5511999998888",
            pinned=False, last_message_at=now, unread_count=0
        )
        db.add(convo)
        db.commit()

        m1 = models.ChatMessage(id=8001, conversation_id=801, sender_type="contact", content="Olá, quero informações", timestamp=now)
        m2 = models.ChatMessage(id=8002, conversation_id=801, sender_type="user", content="Claro! Nosso produto custa R$ 97", timestamp=now)
        m3 = models.ChatMessage(id=8003, conversation_id=801, sender_type="contact", content="Perfeito, vou comprar agora", timestamp=now)
        db.add_all([m1, m2, m3])
        db.commit()

        # 1. Testar Fixar Mensagem (Pin)
        res_pin1 = await toggle_pin_message(conversation_id=801, message_id=8002, client_id=client_id, current_user=user, db=db)
        assert res_pin1["status"] == "success"
        assert res_pin1["action"] == "pinned"
        assert res_pin1["pinned_message_id"] == 8002

        db.refresh(convo)
        assert convo.pinned_message_id == 8002

        # 2. Testar Fixar Outra Mensagem (Substitui anterior)
        res_pin2 = await toggle_pin_message(conversation_id=801, message_id=8003, client_id=client_id, current_user=user, db=db)
        assert res_pin2["action"] == "pinned"
        assert res_pin2["pinned_message_id"] == 8003

        db.refresh(convo)
        assert convo.pinned_message_id == 8003

        # 3. Testar Desafixar (Alternância)
        res_unpin = await toggle_pin_message(conversation_id=801, message_id=8003, client_id=client_id, current_user=user, db=db)
        assert res_unpin["action"] == "unpinned"
        assert res_unpin["pinned_message_id"] is None

        db.refresh(convo)
        assert convo.pinned_message_id is None

        # 4. Testar Favoritar Mensagem (Star)
        res_star1 = await toggle_star_message(conversation_id=801, message_id=8001, client_id=client_id, current_user=user, db=db)
        assert res_star1["status"] == "success"
        assert res_star1["is_starred"] is True

        res_star2 = await toggle_star_message(conversation_id=801, message_id=8002, client_id=client_id, current_user=user, db=db)
        assert res_star2["is_starred"] is True

        db.refresh(m1)
        db.refresh(m2)
        assert m1.is_starred is True
        assert m2.is_starred is True

        # 5. Listar Mensagens Favoritas (Paginado)
        starred_resp = await list_starred_messages(conversation_id=801, page=1, limit=20, client_id=client_id, current_user=user, db=db)
        assert starred_resp["total"] == 2
        assert starred_resp["page"] == 1
        assert len(starred_resp["items"]) == 2
        starred_ids = [m["id"] for m in starred_resp["items"]]
        assert 8001 in starred_ids
        assert 8002 in starred_ids

        # 6. Desfavoritar uma mensagem
        res_unstar = await toggle_star_message(conversation_id=801, message_id=8001, client_id=client_id, current_user=user, db=db)
        assert res_unstar["is_starred"] is False

        starred_resp_after = await list_starred_messages(conversation_id=801, page=1, limit=20, client_id=client_id, current_user=user, db=db)
        assert starred_resp_after["total"] == 1
        assert len(starred_resp_after["items"]) == 1
        assert starred_resp_after["items"][0]["id"] == 8002

    finally:
        # Cleanup
        db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id.in_([801, 802])).delete(synchronize_session=False)
        db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.client_id == client_id).delete(synchronize_session=False)
        db.query(models.Client).filter(models.Client.id == client_id).delete(synchronize_session=False)
        db.commit()
        db.close()
        if os.path.exists("./test_msg_pin_star.db"):
            try:
                os.remove("./test_msg_pin_star.db")
            except Exception:
                pass

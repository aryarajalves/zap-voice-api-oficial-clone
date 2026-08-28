import sys
import os
from datetime import datetime, timedelta
import pytest
from unittest.mock import MagicMock

# Configura banco de dados SQLite para testes
os.environ["DATABASE_URL"] = "sqlite:///./test_conv_pinned.db"
os.environ["SECRET_KEY"] = "test-secret-key-123456789012345678901234567890"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import models
from database import SessionLocal, engine
from routers.chat.conversation_routes import list_conversations

models.Base.metadata.create_all(bind=engine)

@pytest.mark.asyncio
async def test_pinned_conversations_always_on_top_in_all_sort_orders():
    db = SessionLocal()
    client_id = 999
    try:
        # Limpar dados
        db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id.in_([901, 902, 903])).delete(synchronize_session=False)
        db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.client_id == client_id).delete(synchronize_session=False)
        db.query(models.Client).filter(models.Client.id == client_id).delete(synchronize_session=False)
        db.commit()

        client = models.Client(id=client_id, name="Test Client Pinned")
        user = models.User(id=999, email="test_pinned@example.com", client_id=client_id, role="admin")
        db.add_all([client, user])
        db.commit()

        now = datetime.utcnow()

        # 1. Unpinned, contact "Alice", 10 messages, old timestamp
        # 2. Pinned, contact "Zack", 2 messages, medium timestamp
        # 3. Unpinned, contact "Bruno", 50 messages, newest timestamp
        c1 = models.ChatConversation(
            id=901, client_id=client_id, contact_name="Alice", phone="5511999990001",
            pinned=False, last_message_at=now - timedelta(days=5), unread_count=5
        )
        c2 = models.ChatConversation(
            id=902, client_id=client_id, contact_name="Zack", phone="5511999990002",
            pinned=True, last_message_at=now - timedelta(days=2), unread_count=0
        )
        c3 = models.ChatConversation(
            id=903, client_id=client_id, contact_name="Bruno", phone="5511999990003",
            pinned=False, last_message_at=now, unread_count=20
        )
        db.add_all([c1, c2, c3])
        db.commit()

        # Add messages
        for i in range(10):
            db.add(models.ChatMessage(conversation_id=901, sender_type="contact", content=f"msg {i}", timestamp=now))
        for i in range(2):
            db.add(models.ChatMessage(conversation_id=902, sender_type="contact", content=f"msg {i}", timestamp=now))
        for i in range(50):
            db.add(models.ChatMessage(conversation_id=903, sender_type="contact", content=f"msg {i}", timestamp=now))
        db.commit()

        order_modes = ["recent", "oldest", "name_asc", "name_desc", "messages_desc", "messages_asc", "unread_desc"]

        for mode in order_modes:
            res = await list_conversations(
                tab="todos",
                status="all",
                page=1,
                limit=20,
                search=None,
                label=None,
                block_status=None,
                has_note=False,
                start_date=None,
                end_date=None,
                unread_only=False,
                window_open_only=False,
                template_sent_24h_only=False,
                urgent_only=False,
                has_replied=False,
                has_active_funnel=False,
                order_by=mode,
                client_id=client_id,
                current_user=user,
                db=db
            )
            convos = res["conversations"]
            assert len(convos) == 3
            # A conversa fixada (id=902, Zack) DEVE SEMPRE ser o primeiro item
            assert convos[0]["id"] == 902, f"Falha na ordenação por '{mode}': o primeiro item retornado foi {convos[0]['contact_name']} em vez de Zack (fixado)"
            assert convos[0]["pinned"] is True
    finally:
        # Cleanup
        db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id.in_([901, 902, 903])).delete(synchronize_session=False)
        db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.client_id == client_id).delete(synchronize_session=False)
        db.query(models.Client).filter(models.Client.id == client_id).delete(synchronize_session=False)
        db.commit()
        db.close()
        if os.path.exists("./test_conv_pinned.db"):
            try:
                os.remove("./test_conv_pinned.db")
            except Exception:
                pass

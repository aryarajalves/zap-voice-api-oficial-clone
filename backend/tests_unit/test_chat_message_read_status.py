import pytest
import os
import sys
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from routers.chat.message_routes import list_messages, send_chat_message
from core.worker.handlers.whatsapp_status import handle_whatsapp_statuses

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    db_file = "test_temp_chat_status.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    yield db

    db.close()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

@pytest.mark.asyncio
async def test_handle_whatsapp_statuses_updates_chat_message_to_read(db_session):
    # 1. Cria conversa e mensagem
    convo = models.ChatConversation(
        id=100,
        client_id=1,
        phone="5585999999999",
        status="open"
    )
    db_session.add(convo)

    chat_msg = models.ChatMessage(
        id=500,
        conversation_id=100,
        sender_type="user",
        message_type="text",
        content="Olá! Sua proposta foi aprovada.",
        wa_message_id="wamid.HBgLMTEyMjMzNDQ1NQ",
        status="sent",
        meta_data={"status": "sent"}
    )
    db_session.add(chat_msg)
    db_session.commit()

    # 2. Executa handle_whatsapp_statuses com status 'read'
    statuses_payload = [{
        "id": "wamid.HBgLMTEyMjMzNDQ1NQ",
        "status": "read",
        "timestamp": "1710000000",
        "recipient_id": "5585999999999"
    }]

    with patch("core.worker.handlers.whatsapp.rabbitmq.publish_event", new_callable=AsyncMock) as mock_pub:
        await handle_whatsapp_statuses(db_session, statuses_payload, {})
        
        # Verifica se o evento WebSocket foi disparado
        mock_pub.assert_called_once()
        args, kwargs = mock_pub.call_args
        assert args[0] == "message_status_updated"
        payload_sent = args[1]
        assert payload_sent["conversation_id"] == 100
        assert payload_sent["message_id"] == 500
        assert payload_sent["status"] == "read"

    # 3. Verifica se o banco de dados foi atualizado
    db_session.refresh(chat_msg)
    assert chat_msg.status == "read"
    assert chat_msg.meta_data.get("status") == "read"


@pytest.mark.asyncio
async def test_list_messages_returns_read_status(db_session):
    convo = models.ChatConversation(
        id=200,
        client_id=1,
        phone="5585888888888",
        status="open"
    )
    db_session.add(convo)

    chat_msg = models.ChatMessage(
        id=600,
        conversation_id=200,
        sender_type="user",
        message_type="text",
        content="Documento enviado.",
        wa_message_id="wamid.TEST_READ_999",
        status="read"
    )
    db_session.add(chat_msg)
    db_session.commit()

    res = await list_messages(
        conversation_id=200,
        account_id=None,
        limit=50,
        before_id=None,
        client_id=1,
        current_user=mock_user,
        db=db_session
    )

    assert len(res) == 1
    assert res[0]["id"] == 600
    assert res[0]["status"] == "read"

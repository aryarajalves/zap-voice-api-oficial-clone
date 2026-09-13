import pytest
import os
import sys
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from routers.chat.message_routes import (
    router,
    list_messages,
    delete_chat_message,
    react_to_message,
)

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)


@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    db_file = "test_temp_message_routes.db"
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
async def test_modular_router_contains_all_routes():
    route_paths = [r.path for r in router.routes]
    assert "/chat/conversations/{conversation_id}/messages" in route_paths
    assert "/chat/conversations/{conversation_id}/media-and-docs" in route_paths
    assert "/chat/conversations/{conversation_id}/template" in route_paths
    assert "/chat/conversations/{conversation_id}/media" in route_paths
    assert "/chat/conversations/{conversation_id}/messages/{message_id}" in route_paths
    assert "/chat/messages/{message_id}/resend-agentflow" in route_paths
    assert "/chat/react" in route_paths


@pytest.mark.asyncio
async def test_list_messages_clears_unread_count(db_session):
    convo = models.ChatConversation(
        client_id=1,
        phone="5511999990001",
        contact_name="Contato Teste",
        unread_count=5
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="contact",
        content="Olá mundo",
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(msg)
    db_session.commit()

    result = await list_messages(
        conversation_id=convo.id,
        limit=10,
        client_id=1,
        current_user=mock_user,
        db=db_session
    )

    assert len(result) == 1
    assert result[0]["content"] == "Olá mundo"
    db_session.refresh(convo)
    assert convo.unread_count == 0


@pytest.mark.asyncio
async def test_delete_chat_message_success(db_session):
    convo = models.ChatConversation(
        client_id=1,
        phone="5511999990002",
        contact_name="Contato Delete"
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        content="Mensagem a ser apagada",
        wa_message_id="wamid.12345"
    )
    db_session.add(msg)
    db_session.commit()
    db_session.refresh(msg)

    with patch("routers.chat.message_routes._get_whatsapp_client") as mock_wa:
        mock_instance = MagicMock()
        mock_instance.delete_message = AsyncMock(return_value={"success": True})
        mock_wa.return_value = mock_instance

        res = await delete_chat_message(
            conversation_id=convo.id,
            message_id=msg.id,
            client_id=1,
            current_user=mock_user,
            db=db_session
        )

        assert res["success"] is True
        assert res["deleted_id"] == msg.id
        assert db_session.query(models.ChatMessage).filter_by(id=msg.id).first() is None

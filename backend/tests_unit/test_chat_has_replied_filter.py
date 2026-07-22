import pytest
import sys
import os
from datetime import datetime, timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.chat import list_conversations

@pytest.mark.asyncio
async def test_list_conversations_with_has_replied_filter():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Conversa onde o contato enviou mensagem (last_contact_message_at preenchido)
        convo_replied = models.ChatConversation(
            id=300,
            client_id=1,
            status="open",
            contact_name="Contato Que Respondeu",
            phone="5511999999999",
            last_contact_message_at=datetime.now(timezone.utc)
        )
        # Conversa onde o contato nunca enviou mensagem (last_contact_message_at = None)
        convo_no_reply = models.ChatConversation(
            id=301,
            client_id=1,
            status="open",
            contact_name="Contato Sem Resposta",
            phone="5511888888888",
            last_contact_message_at=None
        )
        db.add(convo_replied)
        db.add(convo_no_reply)
        db.commit()
        
        mock_user = models.User(id=1)
        
        # Testar listagem geral (deve retornar 2)
        res_all = await list_conversations(
            tab="todos",
            status="open",
            client_id=1,
            current_user=mock_user,
            db=db
        )
        assert len(res_all["conversations"]) == 2
        
        # Testar filtro de contatos que responderam (has_replied=True)
        res_replied = await list_conversations(
            tab="todos",
            status="open",
            has_replied=True,
            client_id=1,
            current_user=mock_user,
            db=db
        )
        assert len(res_replied["conversations"]) == 1
        assert res_replied["conversations"][0]["contact_name"] == "Contato Que Respondeu"
        
    finally:
        db.close()

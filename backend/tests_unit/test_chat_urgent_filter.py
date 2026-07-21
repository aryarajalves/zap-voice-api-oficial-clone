import pytest
import sys
import os

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.chat import list_conversations

@pytest.mark.asyncio
async def test_list_conversations_with_urgent_filter():
    # Criar banco SQLite em memoria
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Criar dados de teste
        convo1 = models.ChatConversation(
            id=200,
            client_id=1,
            status="open",
            contact_name="Urgente Silva",
            phone="12345678",
            urgent=True
        )
        convo2 = models.ChatConversation(
            id=201,
            client_id=1,
            status="open",
            contact_name="Normal Souza",
            phone="87654321",
            urgent=False
        )
        db.add(convo1)
        db.add(convo2)
        db.commit()
        
        # Mock do current_user
        mock_user = models.User(id=1)
        
        # Testar listagem geral (deve retornar ambos)
        res_all = await list_conversations(
            tab="todos",
            status="open",
            client_id=1,
            current_user=mock_user,
            db=db
        )
        assert len(res_all["conversations"]) == 2
        
        # Testar filtro de urgente apenas (urgent_only=True)
        res_urgent = await list_conversations(
            tab="todos",
            status="open",
            urgent_only=True,
            client_id=1,
            current_user=mock_user,
            db=db
        )
        assert len(res_urgent["conversations"]) == 1
        assert res_urgent["conversations"][0]["contact_name"] == "Urgente Silva"
        
    finally:
        db.close()

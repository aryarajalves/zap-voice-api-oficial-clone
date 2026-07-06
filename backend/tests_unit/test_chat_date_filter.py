import pytest
import sys
import os
from datetime import datetime

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from routers.chat import list_conversations

@pytest.mark.asyncio
async def test_list_conversations_with_date_filters():
    # Criar banco SQLite em memoria
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Criar dados de teste
        convo1 = models.ChatConversation(
            id=100,
            client_id=1,
            status="open",
            contact_name="Aryaraj",
            phone="12345678",
            last_message_at=datetime(2026, 7, 2, 12, 0, 0)
        )
        convo2 = models.ChatConversation(
            id=101,
            client_id=1,
            status="open",
            contact_name="Julia",
            phone="87654321",
            last_message_at=datetime(2026, 7, 6, 12, 0, 0)
        )
        db.add(convo1)
        db.add(convo2)
        db.commit()
        
        # Mock do current_user
        mock_user = models.User(id=1)
        
        # Testar filtro de data inicial
        res = await list_conversations(
            tab="todos",
            status="open",
            start_date="2026-07-04",
            client_id=1,
            current_user=mock_user,
            db=db
        )
        # Deve retornar apenas a Julia (2026-07-06)
        assert len(res) == 1
        assert res[0]["contact_name"] == "Julia"
        
        # Testar filtro de data final
        res_end = await list_conversations(
            tab="todos",
            status="open",
            end_date="2026-07-03",
            client_id=1,
            current_user=mock_user,
            db=db
        )
        # Deve retornar apenas o Aryaraj (2026-07-02)
        assert len(res_end) == 1
        assert res_end[0]["contact_name"] == "Aryaraj"
        
    finally:
        db.close()

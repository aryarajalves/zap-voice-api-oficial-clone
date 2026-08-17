import pytest
import os
import sys
from datetime import datetime, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from routers.chat.message_search_routes import search_conversation_messages

mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    db_file = "test_temp_msg_search.db"
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
async def test_search_conversation_messages(db_session):
    # Criar conversa de teste
    convo = models.ChatConversation(id=100, client_id=1, contact_name="Cliente Teste", phone="5511999990001", status="open")
    db_session.add(convo)
    db_session.commit()

    # Criar mensagens
    m1 = models.ChatMessage(id=1, conversation_id=100, sender_type="contact", content="Olá, quero saber sobre a proposta de mentoria", timestamp=datetime(2026, 8, 15, 10, 0, 0, tzinfo=timezone.utc))
    m2 = models.ChatMessage(id=2, conversation_id=100, sender_type="user", content="Claro! A proposta de mentoria inclui 10 encontros", timestamp=datetime(2026, 8, 15, 10, 5, 0, tzinfo=timezone.utc))
    m3 = models.ChatMessage(id=3, conversation_id=100, sender_type="contact", content="Perfeito, quanto custa o cartão?", timestamp=datetime(2026, 8, 16, 11, 0, 0, tzinfo=timezone.utc))

    db_session.add_all([m1, m2, m3])
    db_session.commit()

    # 1. Busca por termo "proposta"
    res1 = await search_conversation_messages(
        conversation_id=100,
        query="proposta",
        date=None,
        limit=50,
        client_id=1,
        current_user=mock_user,
        db=db_session
    )
    assert res1["total"] == 2
    assert len(res1["messages"]) == 2
    assert "proposta" in res1["messages"][0]["content"].lower()
    assert "proposta" in res1["messages"][1]["content"].lower()

    # 2. Busca por termo "cartão"
    res2 = await search_conversation_messages(
        conversation_id=100,
        query="cartão",
        date=None,
        limit=50,
        client_id=1,
        current_user=mock_user,
        db=db_session
    )
    assert res2["total"] == 1
    assert res2["messages"][0]["id"] == 3

    # 3. Busca por data "2026-08-15"
    res3 = await search_conversation_messages(
        conversation_id=100,
        query=None,
        date="2026-08-15",
        limit=50,
        client_id=1,
        current_user=mock_user,
        db=db_session
    )
    assert res3["total"] == 2

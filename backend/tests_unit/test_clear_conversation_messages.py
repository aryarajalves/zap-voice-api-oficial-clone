import pytest
import os
import sys
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock DB URL
os.environ["DATABASE_URL"] = "sqlite://"

import models
from main import app
from core.deps import get_db, get_current_user

# Mock user dependency
mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

def mock_get_current_user():
    return mock_user

@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    db_file = "test_temp_clear_chat.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
            
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Criar conversas de teste
    c1 = models.ChatConversation(id=101, client_id=1, phone="5511999990001", contact_name="Arya", last_message_content="Olá!", unread_count=2, private_note="Nota VIP")
    c2 = models.ChatConversation(id=102, client_id=2, phone="5511999990002", contact_name="Outro Cliente", last_message_content="Mensagem outro", unread_count=1)
    
    db.add_all([c1, c2])
    db.commit()

    # Criar mensagens para c1
    m1 = models.ChatMessage(id=1, conversation_id=101, sender_type="contact", content="Mensagem 1")
    m2 = models.ChatMessage(id=2, conversation_id=101, sender_type="user", content="Mensagem 2")
    m3 = models.ChatMessage(id=3, conversation_id=101, sender_type="contact", content="Mensagem 3")
    
    # Criar mensagem para c2
    m4 = models.ChatMessage(id=4, conversation_id=102, sender_type="contact", content="Mensagem de outro cliente")

    db.add_all([m1, m2, m3, m4])
    db.commit()
    
    yield db
    db.close()
    engine.dispose()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

def test_clear_conversation_messages_success(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    client = TestClient(app)
    
    response = client.delete("/api/chat/conversations/101/messages")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "ok"
    assert res_data["deleted_count"] == 3
    assert res_data["conversation_id"] == 101
    
    # Valida que as mensagens da conversa 101 foram deletadas
    c1_msgs = db_session.query(models.ChatMessage).filter(models.ChatMessage.conversation_id == 101).all()
    assert len(c1_msgs) == 0
    
    # Valida que a conversa continua existindo com campos limpos e nota preservada
    convo = db_session.query(models.ChatConversation).filter(models.ChatConversation.id == 101).first()
    assert convo is not None
    assert convo.last_message_content is None
    assert convo.unread_count == 0
    assert convo.private_note == "Nota VIP"

    # Valida que mensagens da conversa 102 pertencente a outro cliente não foram afetadas
    c2_msgs = db_session.query(models.ChatMessage).filter(models.ChatMessage.conversation_id == 102).all()
    assert len(c2_msgs) == 1

def test_clear_conversation_messages_not_found(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    client = TestClient(app)
    
    # Conversa inexistente ou de outro cliente (IDOR prevention)
    response = client.delete("/api/chat/conversations/9999/messages")
    assert response.status_code == 404
    assert response.json()["detail"] == "Conversa não encontrada."

    # Conversa ID 102 pertence ao client_id 2, enquanto mock_user é client_id 1
    response_c2 = client.delete("/api/chat/conversations/102/messages")
    assert response_c2.status_code == 404

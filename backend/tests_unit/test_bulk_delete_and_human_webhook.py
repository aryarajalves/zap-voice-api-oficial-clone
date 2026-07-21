import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock DB URL
os.environ["DATABASE_URL"] = "sqlite://"

import models
from main import app
from core.deps import get_db, get_current_user

@pytest.fixture
def anyio_backend():
    return 'asyncio'

# Mock user dependency
mock_user = models.User(id=1, email="test@test.com", client_id=1, is_active=True)

def mock_get_current_user():
    return mock_user

@pytest.fixture
def db_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    db_file = "test_temp_delete.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
            
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Adicionar dados de teste
    c1 = models.ChatConversation(id=10, client_id=1, phone="5511999990001", contact_name="Arya", status="open", private_note="Importante")
    c2 = models.ChatConversation(id=11, client_id=1, phone="5511999990002", contact_name="Jon", status="open", private_note="")
    c3 = models.ChatConversation(id=12, client_id=1, phone="5511999990003", contact_name="Sansa", status="resolved", private_note="Nota")
    c4 = models.ChatConversation(id=13, client_id=2, phone="5511999990004", contact_name="Robb", status="open", private_note="Nota")
    
    db.add_all([c1, c2, c3, c4])
    db.commit()
    
    yield db
    db.close()
    engine.dispose()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

def test_delete_conversations_bulk_select_all_pages(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    client = TestClient(app)
    
    payload = {
        "select_all_pages": True,
        "tab": "todos",
        "status": "all",
        "has_note": True
    }
    
    response = client.request("DELETE", "/api/chat/conversations", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["deleted_count"] == 2
    
    left_convos = db_session.query(models.ChatConversation).all()
    left_ids = {c.id for c in left_convos}
    assert 10 not in left_ids
    assert 12 not in left_ids
    assert 11 in left_ids
    assert 13 in left_ids

@pytest.mark.anyio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_human_message_sends_to_webhook_of_memory(mock_get_setting, mock_rabbitmq, db_session):
    from services.ai_memory import notify_agent_memory_webhook
    
    mock_get_setting.side_effect = lambda key, default="", client_id=None: "https://mock.webhook" if key == "AGENT_MEMORY_WEBHOOK_URL" else default
    mock_rabbitmq.publish = AsyncMock()
    
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999990001",
        name="Arya",
        template_name="Mensagem do Atendente",
        content="Olá, sou um atendente humano.",
        internal_contact_id=10,
        dono="atendente"
    )
    
    mock_rabbitmq.publish.assert_called_once()
    args, kwargs = mock_rabbitmq.publish.call_args
    payload = args[1]
    
    assert payload["Dono"] == "atendente"
    assert payload["template_name"] == "Mensagem do Atendente"
    assert payload["platform"] == "outra"
    assert payload["contact_id"] == 10

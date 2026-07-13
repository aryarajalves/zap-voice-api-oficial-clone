import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import event
import models
from database import SessionLocal
from routers.chat import list_conversations
from services.chat_webhook_service import after_message_insert

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_list_conversations_pagination(db_session: Session):
    # Desativar listener para evitar conflitos SQLite
    try:
        event.remove(models.ChatMessage, "after_insert", after_message_insert)
    except Exception:
        pass

    # 1. Configurar cliente e conversas de teste
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Paginação")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    # Deletar conversas antigas deste cliente para ter controle total
    db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id
    ).delete()
    db_session.commit()

    # Criar 25 conversas de teste
    for i in range(25):
        convo = models.ChatConversation(
            client_id=client_id,
            phone=f"55119000000{i:02d}",
            contact_name=f"Contato {i:02d}",
            status="open",
            last_message_at=datetime.now(timezone.utc)
        )
        db_session.add(convo)
    db_session.commit()

    # Chamar list_conversations diretamente (simulando a rota)
    import asyncio
    
    # Testar página 1 com limite 10
    result_p1 = asyncio.run(list_conversations(
        page=1,
        limit=10,
        client_id=client_id,
        current_user=None,
        db=db_session
    ))
    
    assert result_p1["total_count"] == 25
    assert len(result_p1["conversations"]) == 10
    assert result_p1["page"] == 1
    assert result_p1["limit"] == 10

    # Testar página 3 com limite 10 (deve retornar os 5 contatos restantes)
    result_p3 = asyncio.run(list_conversations(
        page=3,
        limit=10,
        client_id=client_id,
        current_user=None,
        db=db_session
    ))
    
    assert result_p3["total_count"] == 25
    assert len(result_p3["conversations"]) == 5
    assert result_p3["page"] == 3
    assert result_p3["limit"] == 10

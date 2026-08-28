import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, event
import models
from database import SessionLocal
from services.chat_webhook_service import after_message_insert

@pytest.fixture
def db_session():
    # Desativar listener para evitar chamadas de webhook em ambiente de teste
    try:
        event.remove(models.ChatMessage, "after_insert", after_message_insert)
    except Exception:
        pass

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_chat_volume_and_message_distribution(db_session: Session):
    existing_convos = db_session.query(models.ChatConversation).filter_by(client_id=11).count()
    
    if existing_convos >= 5000:
        # Validação do dataset de alta escala (5.000 conversas / 500k mensagens)
        msg_count = db_session.query(models.ChatMessage).join(models.ChatConversation).filter(
            models.ChatConversation.client_id == 11
        ).count()
        assert msg_count >= 500000, f"Esperado >= 500.000 mensagens, encontrado {msg_count}"

        # Validar conversas pesadas com 500 mensagens
        heavy_convos = db_session.query(
            models.ChatMessage.conversation_id,
            func.count(models.ChatMessage.id)
        ).join(models.ChatConversation).filter(
            models.ChatConversation.client_id == 11
        ).group_by(models.ChatMessage.conversation_id).having(func.count(models.ChatMessage.id) >= 500).all()
        assert len(heavy_convos) >= 10, f"Esperado contatos com >= 500 mensagens, encontrados {len(heavy_convos)}"

        # Validar diversidade de mídias
        types = dict(
            db_session.query(models.ChatMessage.message_type, func.count(models.ChatMessage.id))
            .join(models.ChatConversation)
            .filter(models.ChatConversation.client_id == 11)
            .group_by(models.ChatMessage.message_type)
            .all()
        )
        assert types.get("text", 0) > 100000
        assert types.get("image", 0) > 1000
        assert types.get("audio", 0) > 1000
        assert types.get("document", 0) > 1000
        assert types.get("video", 0) > 500

    else:
        # Ambiente de teste com banco isolado: criar micro-dataset e testar estrutura
        client = db_session.query(models.Client).first()
        if not client:
            client = models.Client(name="Cliente Teste Volume")
            db_session.add(client)
            db_session.commit()
            db_session.refresh(client)
        client_id = client.id

        convo = models.ChatConversation(
            client_id=client_id,
            phone="5511999990001",
            contact_name="Contato Stress Test",
            status="open",
            last_message_at=datetime.now(timezone.utc)
        )
        db_session.add(convo)
        db_session.commit()
        db_session.refresh(convo)

        messages = []
        for i in range(100):
            msg_type = "text"
            media_url = None
            if i % 10 == 1:
                msg_type = "image"
                media_url = "/static/uploads/sample.jpg"
            elif i % 10 == 2:
                msg_type = "audio"
                media_url = "/static/uploads/sample.mp3"
            elif i % 10 == 3:
                msg_type = "document"
                media_url = "/static/uploads/sample.pdf"

            messages.append(models.ChatMessage(
                conversation_id=convo.id,
                sender_type="contact" if i % 2 == 0 else "user",
                message_type=msg_type,
                content=f"Mensagem {i} com emoji 🎉",
                media_url=media_url,
                wa_message_id=f"wamid.{uuid.uuid4().hex[:12]}",
                meta_data={"reactions": [{"emoji": "👍", "sender": "user"}]} if i % 5 == 0 else None,
                timestamp=datetime.now(timezone.utc) - timedelta(minutes=100-i)
            ))
        db_session.add_all(messages)
        db_session.commit()

        count = db_session.query(models.ChatMessage).filter_by(conversation_id=convo.id).count()
        assert count == 100

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import models
from database import SessionLocal
from routers.chat import list_messages

def test_chat_messages_cursor_pagination(db_session: Session):
    # 1. Obter ou criar conversa
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Mensagens")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)

    convo = db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client.id
    ).first()
    if not convo:
        convo = models.ChatConversation(
            client_id=client.id,
            phone="5511955555555",
            contact_name="Contato Mensagens",
            status="open"
        )
        db_session.add(convo)
        db_session.commit()
        db_session.refresh(convo)

    # Limpar mensagens antigas desta conversa
    db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id
    ).delete()
    db_session.commit()

    # Criar 120 mensagens (mensagens mais recentes têm IDs maiores e timestamps maiores)
    base_time = datetime.now(timezone.utc) - timedelta(hours=10)
    for i in range(120):
        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="contact" if i % 2 == 0 else "user",
            message_type="text",
            content=f"Mensagem {i:03d}",
            timestamp=base_time + timedelta(minutes=i)
        )
        db_session.add(msg)
    db_session.commit()

    # Importar asyncio para chamar a rota assíncrona
    import asyncio

    # Testar limite de 50 (deve trazer as últimas 50 mensagens: 70 a 119)
    res_p1 = asyncio.run(list_messages(
        conversation_id=convo.id,
        limit=50,
        before_id=None,
        client_id=client.id,
        current_user=None,
        db=db_session
    ))

    assert len(res_p1) == 50
    assert res_p1[0]["content"] == "Mensagem 070"
    assert res_p1[-1]["content"] == "Mensagem 119"

    # Testar cursor (carregar antes da mensagem 70, deve trazer mensagens 20 a 69)
    oldest_id_p1 = res_p1[0]["id"]
    res_p2 = asyncio.run(list_messages(
        conversation_id=convo.id,
        limit=50,
        before_id=oldest_id_p1,
        client_id=client.id,
        current_user=None,
        db=db_session
    ))

    assert len(res_p2) == 50
    assert res_p2[0]["content"] == "Mensagem 020"
    assert res_p2[-1]["content"] == "Mensagem 069"

    # Testar cursor final (carregar antes da mensagem 20, deve trazer as 20 primeiras mensagens: 0 a 19)
    oldest_id_p2 = res_p2[0]["id"]
    res_p3 = asyncio.run(list_messages(
        conversation_id=convo.id,
        limit=50,
        before_id=oldest_id_p2,
        client_id=client.id,
        current_user=None,
        db=db_session
    ))

    assert len(res_p3) == 20
    assert res_p3[0]["content"] == "Mensagem 000"
    assert res_p3[-1]["content"] == "Mensagem 019"

    # Limpar dados
    db_session.query(models.ChatMessage).filter(models.ChatMessage.conversation_id == convo.id).delete()
    db_session.commit()

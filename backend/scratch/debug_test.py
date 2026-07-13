import asyncio
from datetime import datetime, timezone, timedelta
import models
from database import SessionLocal
from routers.chat import list_messages

db = SessionLocal()
try:
    client = db.query(models.Client).first()
    if not client:
        client = models.Client(name="Debug Client")
        db.add(client)
        db.commit()
        db.refresh(client)
    
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client.id
    ).first()
    if not convo:
        convo = models.ChatConversation(
            client_id=client.id,
            phone="5511955555555",
            contact_name="Debug Contact",
            status="open"
        )
        db.add(convo)
        db.commit()
        db.refresh(convo)

    # Limpar mensagens
    db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id
    ).delete()
    db.commit()

    # Criar mensagens
    base_time = datetime.now(timezone.utc) - timedelta(hours=10)
    for i in range(120):
        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="user",
            message_type="text",
            content=f"Msg {i}",
            timestamp=base_time + timedelta(minutes=i)
        )
        db.add(msg)
    db.commit()

    # Verificar mensagens diretamente no banco
    direct_msgs = db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id == convo.id).all()
    print("Total de mensagens gravadas no banco:", len(direct_msgs))

    # Chamar list_messages
    res = asyncio.run(list_messages(
        conversation_id=convo.id,
        limit=50,
        before_id=None,
        client_id=client.id,
        current_user=None,
        db=db
    ))
    print("Mensagens retornadas pela list_messages:", len(res))

finally:
    db.close()

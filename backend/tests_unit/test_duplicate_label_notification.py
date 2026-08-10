import pytest
from sqlalchemy.orm import Session
import models
from routers.chat import update_conversation_labels

def test_duplicate_label_notification_ignored(db_session: Session):
    # Criar conversa de teste
    convo = models.ChatConversation(
        client_id=1,
        phone="5511999998888",
        contact_name="Regia",
        status="open",
        labels=["24-horas", "robo", "whatsApp"]
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # Mock user
    user = models.User(id=1, email="admin@test.com", full_name="Super Admin")

    # Tentar re-adicionar a etiqueta 'whatsApp' (que já existe no contato)
    # Enviamos a lista que contém a mesma etiqueta 'whatsApp' mais outras que já existiam
    payload = {"labels": ["24-horas", "robo", "whatsApp"]}
    
    # Executar a atualização de etiquetas
    import asyncio
    res = asyncio.run(update_conversation_labels(
        conversation_id=convo.id,
        payload=payload,
        client_id=1,
        current_user=user,
        db=db_session
    ))

    assert res["status"] == "ok"

    # Verificar mensagens de sistema geradas no chat
    sys_msgs = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id,
        models.ChatMessage.sender_type == "system"
    ).all()

    # Nenhuma nova mensagem de sistema deve ser gerada, pois 'whatsApp' já pertencia à conversa
    assert len(sys_msgs) == 0

def test_case_insensitive_label_duplicate_ignored(db_session: Session):
    # Criar conversa de teste com 'whatsapp' em minúsculo
    convo = models.ChatConversation(
        client_id=1,
        phone="5511999997777",
        contact_name="Regia 2",
        status="open",
        labels=["whatsapp"]
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    user = models.User(id=1, email="admin@test.com", full_name="Super Admin")

    # Tentar adicionar 'whatsApp' (com W e A maiúsculos)
    payload = {"labels": ["whatsApp"]}
    
    import asyncio
    res = asyncio.run(update_conversation_labels(
        conversation_id=convo.id,
        payload=payload,
        client_id=1,
        current_user=user,
        db=db_session
    ))

    sys_msgs = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id,
        models.ChatMessage.sender_type == "system"
    ).all()

    # Como 'whatsapp' e 'whatsApp' são a mesma etiqueta, NENHUMA mensagem de sistema deve ser gerada
    assert len(sys_msgs) == 0

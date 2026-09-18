import pytest
from datetime import datetime, timezone
import models

def test_chat_template_messages_integrity(db_session):
    # 1. Criar cliente de teste
    client = models.Client(name="Cliente Teste Templates")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    # 2. Criar conversa de teste
    convo = models.ChatConversation(
        client_id=client.id,
        phone="5511999990001",
        contact_name="Lead Template Teste",
        status="open",
        last_message_content="Template Teste",
        last_message_at=datetime.now(timezone.utc)
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # 3. Criar mensagem de template com metadados ricos (botões e header)
    meta_data = {
        "is_template": True,
        "template_name": "confirmacao_pedido",
        "buttons": ["Rastrear Pedido", "Falar com Atendente"],
        "status": "delivered",
        "header": {"format": "IMAGE"}
    }
    
    msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        user_id=1,
        message_type="template",
        content="Olá Lead, seu pedido #12345 foi confirmado!",
        media_url="https://images.unsplash.com/photo-1556742049-0a67e5572243",
        timestamp=datetime.now(timezone.utc),
        wa_message_id="wamid.HBgLTEST12345",
        meta_data=meta_data
    )
    db_session.add(msg)
    db_session.commit()
    db_session.refresh(msg)

    # 4. Asserts de integridade
    assert msg.id is not None
    assert msg.message_type == "template"
    assert msg.meta_data["is_template"] is True
    assert msg.meta_data["template_name"] == "confirmacao_pedido"
    assert len(msg.meta_data["buttons"]) == 2
    assert msg.meta_data["buttons"][0] == "Rastrear Pedido"
    assert msg.meta_data["header"]["format"] == "IMAGE"
    assert msg.media_url is not None

    # 5. Testar busca na conversa
    fetched = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id,
        models.ChatMessage.message_type == "template"
    ).first()
    assert fetched is not None
    assert fetched.meta_data["template_name"] == "confirmacao_pedido"

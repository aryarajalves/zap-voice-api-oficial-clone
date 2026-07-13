import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
from database import SessionLocal
from routers.chat import send_chat_template

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.mark.asyncio
@patch("routers.chat.ChatwootClient")
@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
async def test_send_chat_template_endpoint(mock_publish_event, mock_chatwoot_class, db_session: Session):
    from sqlalchemy import event
    from services.chat_webhook_service import after_message_insert
    try:
        event.remove(models.ChatMessage, "after_insert", after_message_insert)
    except Exception:
        pass

    # Mock ChatwootClient.send_template response
    mock_cw_instance = AsyncMock()
    mock_cw_instance.send_template.return_value = {
        "messages": [{"id": "wamid.HBgNNTUxMTk4ODg4ODg4OAYVAgIPEhgUM0EBQ0RGQzRFQ0ZDRTFBQzFDMkUA"}]
    }
    mock_chatwoot_class.return_value = mock_cw_instance

    # 1. Configurar cliente e conversa de teste
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Envio Template")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    convo = models.ChatConversation(
        client_id=client_id,
        phone="5511988888888",
        contact_name="Contato Teste Template",
        status="open"
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # 2. Criar template cache local para simular a resposta de conteúdo
    tpl_cache = models.WhatsAppTemplateCache(
        id=1234567,
        client_id=client_id,
        name="boas_vindas_teste",
        language="pt_BR",
        category="MARKETING",
        body="Olá {{1}}, seu código é {{2}}.",
        components=[
            {"type": "HEADER", "format": "TEXT", "text": "Cabeçalho"},
            {"type": "BUTTONS", "buttons": [{"type": "QUICK_REPLY", "text": "Confirmar"}, {"type": "QUICK_REPLY", "text": "Cancelar"}]}
        ]
    )
    db_session.add(tpl_cache)
    db_session.commit()

    # Query or create mock user in the DB
    mock_user = db_session.query(models.User).filter_by(client_id=client_id).first()
    if not mock_user:
        mock_user = models.User(
            email="test@example.com", 
            role="admin", 
            client_id=client_id,
            hashed_password="fakehash"
        )
        db_session.add(mock_user)
        db_session.commit()
        db_session.refresh(mock_user)

    try:
        # 3. Executar o envio de template
        payload = {
            "template_name": "boas_vindas_teste",
            "language": "pt_BR",
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Ary"},
                        {"type": "text", "text": "1234"}
                    ]
                }
            ]
        }
        
        result = await send_chat_template(
            conversation_id=convo.id,
            payload=payload,
            client_id=client_id,
            current_user=mock_user,
            db=db_session
        )

        assert result["conversation_id"] == convo.id
        assert result["content"] == "Olá Ary, seu código é 1234."
        assert result["wa_message_id"] == "HBgNNTUxMTk4ODg4ODg4OAYVAgIPEhgUM0EBQ0RGQzRFQ0ZDRTFBQzFDMkUA"
        assert result["meta_data"]["is_template"] is True
        assert result["meta_data"]["template_name"] == "boas_vindas_teste"
        assert result["meta_data"]["buttons"] == ["Confirmar", "Cancelar"]

        # Verificar se a mensagem foi salva no banco de dados
        chat_msg = db_session.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == convo.id
        ).first()
        assert chat_msg is not None
        assert chat_msg.content == "Olá Ary, seu código é 1234."
        
    finally:
        # Cleanup
        db_session.delete(tpl_cache)
        db_session.delete(convo)
        db_session.commit()

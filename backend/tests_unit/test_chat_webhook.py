import pytest
import time
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

import models
from database import SessionLocal

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_chat_message_insert_triggers_webhook(db_session: Session):
    """
    Testa se a inserção de um ChatMessage dispara o envio de webhook via services.chat_webhook_service.
    """
    # 1. Criar um cliente de teste se não houver
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Webhook")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    # 2. Configurar a URL do webhook no banco de dados para este cliente
    webhook_key = "CHAT_MESSAGES_WEBHOOK_URL"
    webhook_url = "http://mock-agentflow.local/webhook"
    
    # Limpar qualquer config anterior
    db_session.query(models.AppConfig).filter(
        models.AppConfig.client_id == client_id,
        models.AppConfig.key == webhook_key
    ).delete()
    
    config = models.AppConfig(
        client_id=client_id,
        key=webhook_key,
        value=webhook_url
    )
    db_session.add(config)
    db_session.commit()

    # 3. Garantir a existência de uma conversa local no banco
    phone_test = "5511999999999"
    db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.phone == phone_test
    ).delete()
    
    convo = models.ChatConversation(
        client_id=client_id,
        phone=phone_test,
        contact_name="Contato Mock",
        status="open"
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # 4. Mockar a função dispatch_webhook_in_thread para capturar a chamada
    from services.chat_webhook_service import dispatch_webhook_in_thread
    
    with patch("services.chat_webhook_service.dispatch_webhook_in_thread") as mock_dispatch:
        # Criar a mensagem
        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="user",
            message_type="text",
            content="Olá ZapVoice!",
            meta_data={"test": True}
        )
        db_session.add(msg)
        db_session.commit()
        
        # Como o listener roda síncrono após o insert do SQLAlchemy na transação,
        # o mock_dispatch deve ser chamado imediatamente!
        mock_dispatch.assert_called_once()
        
        # Verificar o payload enviado
        args, kwargs = mock_dispatch.call_args
        target_url = args[0]
        payload = args[1]
        
        assert target_url == webhook_url
        assert payload["event"] == "message.created"
        assert payload["client_id"] == client_id
        assert payload["message"]["content"] == "Olá ZapVoice!"
        assert payload["message"]["sender_type"] == "user"
        assert payload["contact"]["phone"] == phone_test
        assert payload["contact"]["name"] == "Contato Mock"

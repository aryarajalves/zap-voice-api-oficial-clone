import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from sqlalchemy import event
import models
from database import SessionLocal
from routers.chat import resend_message_to_agentflow
from services.chat_webhook_service import after_message_insert

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_resend_message_to_agentflow_sends_24h_window(db_session: Session):
    # Remover o listener de after_insert para evitar abrir sessões paralelas do SQLite
    # e prevenir conflitos de concorrência que deletam ou invalidam as linhas inseridas.
    try:
        event.remove(models.ChatMessage, "after_insert", after_message_insert)
    except Exception:
        pass

    # 1. Configurar cliente, conversa e mensagem
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Reenvio")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    # Configurar webhook url
    webhook_key = "CHAT_MESSAGES_WEBHOOK_URL"
    webhook_url = "http://mock-agentflow.local/webhook-resend"
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

    # Definir last_contact_message_at para 2 horas atrás
    now = datetime.now(timezone.utc)
    last_msg_at = now - timedelta(hours=2)

    phone_test = "5511988888888"
    db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.phone == phone_test
    ).delete()

    convo = models.ChatConversation(
        client_id=client_id,
        phone=phone_test,
        contact_name="Contato Reenvio 24h",
        status="open",
        last_contact_message_at=last_msg_at
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # Criar mensagem diretamente como 'contact' (agora o listener está desativado)
    msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="contact",
        message_type="text",
        content="Reenviar ao AgentFlow!",
        meta_data={"original": True}
    )
    db_session.add(msg)
    db_session.commit()
    msg_id = msg.id

    # Log debug info
    all_msgs = db_session.query(models.ChatMessage).all()
    print("MSGS NO BANCO:", [(m.id, m.sender_type, m.content) for m in all_msgs])

    # Mockar dispatch_webhook_in_thread para a chamada de reenvio
    with patch("services.chat_webhook_service.dispatch_webhook_in_thread") as mock_dispatch:
        # Chamar a rota de reenvio
        import asyncio
        asyncio.run(resend_message_to_agentflow(
            message_id=msg_id,
            client_id=client_id,
            current_user=None,
            db=db_session
        ))
        
        mock_dispatch.assert_called_once()
        args, kwargs = mock_dispatch.call_args
        target_url = args[0]
        payload = args[1]
        
        assert target_url == webhook_url
        assert "window_24h" in payload
        assert "window_24h" in payload["contact"]
        assert "window_24h" in payload["message"]["metadata"]
        
        window = payload["window_24h"]
        assert window["last_contact_message_at"].split('.')[0] == last_msg_at.isoformat().split('.')[0]
        assert 79000 <= window["remaining_seconds"] <= 79300


def test_resend_message_to_agentflow_with_custom_content(db_session: Session):
    from routers.chat import ResendAgentFlowPayload
    try:
        event.remove(models.ChatMessage, "after_insert", after_message_insert)
    except Exception:
        pass

    # 1. Configurar cliente, conversa e mensagem
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Reenvio Editado")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
    client_id = client.id

    # Configurar webhook url
    webhook_key = "CHAT_MESSAGES_WEBHOOK_URL"
    webhook_url = "http://mock-agentflow.local/webhook-resend-edit"
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

    phone_test = "5511977777777"
    db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.phone == phone_test
    ).delete()

    convo = models.ChatConversation(
        client_id=client_id,
        phone=phone_test,
        contact_name="Contato Reenvio Editado",
        status="open",
        last_contact_message_at=datetime.now(timezone.utc)
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="contact",
        message_type="text",
        content="Conteudo original",
    )
    db_session.add(msg)
    db_session.commit()
    msg_id = msg.id

    # Mockar dispatch_webhook_in_thread
    with patch("services.chat_webhook_service.dispatch_webhook_in_thread") as mock_dispatch:
        import asyncio
        asyncio.run(resend_message_to_agentflow(
            message_id=msg_id,
            payload_data=ResendAgentFlowPayload(content="Conteudo alterado!"),
            client_id=client_id,
            current_user=None,
            db=db_session
        ))
        
        mock_dispatch.assert_called_once()
        args, kwargs = mock_dispatch.call_args
        payload = args[1]
        
        # Verificar se o conteudo foi alterado no payload e no banco de dados
        assert payload["message"]["content"] == "Conteudo alterado!"
        
        db_session.refresh(msg)
        assert msg.content == "Conteudo alterado!"

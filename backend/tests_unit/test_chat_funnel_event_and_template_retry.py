import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.orm import Session
import models
from core.worker.handlers.whatsapp_inbound.trigger_evaluator import record_funnel_started_event_in_chat
from routers.chat.message_template_routes import retry_failed_template_message


@pytest.mark.asyncio
async def test_record_funnel_started_event_in_chat(db_session: Session):
    # 1. Configurar cliente e conversa de teste
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Funnel Event")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)

    convo = models.ChatConversation(
        client_id=client.id,
        phone="5511999990001",
        contact_name="Contato Funnel Event",
        status="open"
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # 2. Executar record_funnel_started_event_in_chat
    await record_funnel_started_event_in_chat(
        db=db_session,
        client_id=client.id,
        chat_convo_id=convo.id,
        funnel_id=42,
        funnel_name="Onboarding VIP",
        trigger_id=999
    )

    # 3. Validar gravacao da mensagem no banco
    msg = db_session.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == convo.id,
        models.ChatMessage.sender_type == "system"
    ).order_by(models.ChatMessage.id.desc()).first()

    assert msg is not None
    assert msg.message_type == "funnel_event"
    assert "Onboarding VIP" in msg.content
    assert msg.meta_data.get("is_funnel_event") is True
    assert msg.meta_data.get("funnel_id") == 42
    assert msg.meta_data.get("funnel_name") == "Onboarding VIP"
    assert msg.meta_data.get("trigger_id") == 999


@pytest.mark.asyncio
@patch("routers.chat.message_template_routes._get_cw_client")
async def test_retry_failed_template_message(mock_get_cw, db_session: Session):
    mock_cw_instance = AsyncMock()
    mock_cw_instance.send_template.return_value = {
        "messages": [{"id": "wamid.RETRY_SUCCESS_12345"}]
    }
    mock_get_cw.return_value = mock_cw_instance

    # 1. Configurar cliente e conversa de teste
    client = db_session.query(models.Client).first()
    if not client:
        client = models.Client(name="Cliente Teste Retry Template")
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)

    convo = models.ChatConversation(
        client_id=client.id,
        phone="5511999990002",
        contact_name="Contato Retry Template",
        status="open"
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)

    # 2. Criar mensagem de template com status 'failed'
    failed_msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        message_type="template",
        content="[Template: compra_aprovada_bussula]",
        wa_message_id="wamid.OLD_FAILED",
        meta_data={
            "is_template": True,
            "template_name": "compra_aprovada_bussula",
            "status": "failed",
            "failure_reason": "Erro Meta 2: Service temporarily unavailable",
            "can_retry": True
        }
    )
    db_session.add(failed_msg)
    db_session.commit()
    db_session.refresh(failed_msg)

    mock_user = MagicMock()
    mock_user.id = 1

    # 3. Invocar a rota de retry
    res = await retry_failed_template_message(
        conversation_id=convo.id,
        message_id=failed_msg.id,
        client_id=client.id,
        current_user=mock_user,
        db=db_session
    )

    assert res["status"] == "ok"
    assert "compra_aprovada_bussula" in res["message"]
    assert res["wa_message_id"] == "RETRY_SUCCESS_12345"

    # 4. Validar estado atualizado no banco
    updated_msg = db_session.query(models.ChatMessage).filter(models.ChatMessage.id == failed_msg.id).first()
    assert updated_msg is not None
    assert updated_msg.wa_message_id == "RETRY_SUCCESS_12345"
    assert updated_msg.meta_data.get("status") == "sent"
    assert "failure_reason" not in updated_msg.meta_data
    assert updated_msg.meta_data.get("can_retry") is False

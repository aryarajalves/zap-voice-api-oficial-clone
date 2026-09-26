import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
import models
from core.worker.handlers.funnel import handle_funnel_execution
from core.worker.handlers.whatsapp_status import handle_whatsapp_statuses, handle_deferred_post_delivery

@pytest.mark.asyncio
async def test_template_dispatch_does_not_create_chat_convo_prematurely(db_session, mock_rabbitmq_session):
    """
    Testa que ao disparar um template pelo worker, nenhuma ChatConversation
    é criada prematuramente antes da confirmação real de entrega da Meta.
    """
    # 1. Configurar dados de teste
    client = models.Client(id=999, name="Test Client")
    db_session.add(client)
    db_session.commit()

    trigger = models.ScheduledTrigger(
        id=777,
        client_id=999,
        template_name="mensagem_bussola_porta_aberta_oficial",
        contact_phone="5555519934480",
        contact_name="Paloma Manfio",
        status="processing",
        scheduled_time=datetime.now(timezone.utc),
        chatwoot_label="Lead, Quente",
        private_message="true",
        is_bulk=False
    )
    db_session.add(trigger)
    db_session.commit()

    # Mock do ChatwootClient.send_template retornando sucesso da API (HTTP 200 de aceite da Meta)
    mock_cw = MagicMock()
    mock_cw.send_template = AsyncMock(return_value={"messages": [{"id": "wamid.HBgNNTU1NTE5OTM0NDgw"}]})
    mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 1001, "account_id": 1})
    mock_cw.create_private_note = AsyncMock()
    mock_cw.add_label_to_conversation = AsyncMock()

    with patch("core.worker.handlers.funnel.ChatwootClient", return_value=mock_cw), \
         patch("core.worker.handlers.funnel.SessionLocal", return_value=db_session):
        
        await handle_funnel_execution({"trigger_id": 777})

    # Verificar que o template foi enviado para a Meta
    mock_cw.send_template.assert_called_once()

    # GARANTIA CENTRAL: Não deve ter chamado ensure_conversation nem criado ChatConversation local
    mock_cw.ensure_conversation.assert_not_called()
    mock_cw.create_private_note.assert_not_called()
    mock_cw.add_label_to_conversation.assert_not_called()

    # Nenhuma ChatConversation deve ter sido criada no banco local
    convos = db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == 999,
        models.ChatConversation.phone.like("%19934480")
    ).all()
    assert len(convos) == 0, "ChatConversation NÃO deve ser criada no momento do envio do template!"

    # O MessageStatus foi criado com pending_private_note
    ms = db_session.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id == 777
    ).first()
    assert ms is not None
    assert ms.status == "sent"
    assert ms.pending_private_note is not None


@pytest.mark.asyncio
async def test_template_failure_status_does_not_create_chat_convo(db_session, mock_rabbitmq_session):
    """
    Testa que quando a Meta notifica falha de entrega (status 'failed', ex: Erro 131026 Message undeliverable),
    nenhuma conversa é criada no Chat Local e o trigger é marcado como failed.
    """
    client = models.Client(id=999, name="Test Client")
    db_session.add(client)
    db_session.commit()

    trigger = models.ScheduledTrigger(
        id=778,
        client_id=999,
        template_name="mensagem_bussola_porta_aberta_oficial",
        contact_phone="5555519934480",
        contact_name="Paloma Manfio",
        status="sent",
        scheduled_time=datetime.now(timezone.utc),
        chatwoot_label="Lead",
        is_bulk=False
    )
    db_session.add(trigger)
    db_session.commit()

    ms = models.MessageStatus(
        id=888,
        trigger_id=778,
        message_id="HBgNNTU1NTE5OTM0NDgw",
        phone_number="5555519934480",
        status="sent",
        message_type="TEMPLATE",
        content="[Template: mensagem_bussola_porta_aberta_oficial]"
    )
    db_session.add(ms)
    db_session.commit()

    # Status de falha da Meta
    statuses_payload = [
        {
            "id": "wamid.HBgNNTU1NTE5OTM0NDgw",
            "status": "failed",
            "recipient_id": "5555519934480",
            "errors": [
                {
                    "code": 131026,
                    "title": "Message undeliverable",
                    "message": "Message undeliverable"
                }
            ]
        }
    ]

    with patch("core.worker.handlers.whatsapp.handle_deferred_post_delivery", new_callable=AsyncMock) as mock_deferred:
        await handle_whatsapp_statuses(db_session, statuses_payload, {})

        # handle_deferred_post_delivery NÃO deve ser acionado em caso de falha
        mock_deferred.assert_not_called()

    # Nenhuma ChatConversation foi criada
    convos = db_session.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == 999,
        models.ChatConversation.phone.like("%19934480")
    ).all()
    assert len(convos) == 0, "ChatConversation NÃO deve ser criada quando o template falha!"

    # O trigger deve ter status failed com a razão do erro
    db_session.refresh(trigger)
    assert trigger.status == "failed"
    assert "131026" in trigger.failure_reason or "undeliverable" in trigger.failure_reason.lower()

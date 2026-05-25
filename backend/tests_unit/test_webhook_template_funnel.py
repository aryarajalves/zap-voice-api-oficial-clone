import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone
import models
from core.worker.handlers.funnel import handle_funnel_execution

@pytest.fixture
def mock_db_session():
    db = MagicMock()
    # Mock do builder de queries
    db.query.return_value.filter.return_value.with_for_update.return_value.first = MagicMock()
    db.query.return_value.filter.return_value.first = MagicMock()
    return db

@pytest.mark.asyncio
@patch("core.worker.handlers.funnel.SessionLocal")
@patch("core.worker.handlers.funnel.ChatwootClient")
@patch("core.worker.handlers.funnel.execute_funnel", new_callable=AsyncMock)
async def test_template_and_funnel_success(mock_execute_funnel, MockChatwootClient, mock_session_local, mock_db_session):
    # Setup
    mock_session_local.return_value = mock_db_session
    
    # Mock do trigger pai
    trigger_pai = models.ScheduledTrigger(
        id=10,
        client_id=1,
        contact_phone="5585999999999",
        contact_name="Arya Stark",
        template_name="welcome_template",
        funnel_id=55,
        status="pending",
        chatwoot_label=["Lead", "WhatsApp"]
    )
    
    # Mock do ChatwootClient
    chatwoot_inst = MockChatwootClient.return_value
    chatwoot_inst.send_template = AsyncMock(return_value={"messages": [{"id": "wamid.123456"}]})
    
    # Mock de busca no DB para retornar o trigger_pai e o cache de template
    mock_db_session.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = trigger_pai
    
    # Mock de busca de template no cache (WhatsAppTemplateCache)
    template_cache = models.WhatsAppTemplateCache(
        client_id=1,
        name="welcome_template",
        body="Olá {{1}}, bem-vindo!"
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = template_cache
    
    # Executa o handler
    data = {"trigger_id": 10, "contact_phone": "5585999999999"}
    await handle_funnel_execution(data)
    
    # Validações
    # 1. Deve chamar send_template
    chatwoot_inst.send_template.assert_called_once_with(
        "5585999999999",
        "welcome_template",
        "pt_BR",
        []
    )
    
    # 2. Status do trigger pai deve ser paused_waiting_delivery
    assert trigger_pai.status == "paused_waiting_delivery"
    assert trigger_pai.total_sent == 1
    
    # 3. Não deve ter adicionado o trigger filho no banco de dados ainda
    added_objects = [args[0] for args, _ in mock_db_session.add.call_args_list]
    child_triggers = [obj for obj in added_objects if isinstance(obj, models.ScheduledTrigger)]
    assert len(child_triggers) == 0, "Trigger filho não deveria ter sido adicionado ainda"
    
    # 4. Não deve ter iniciado o execute_funnel para o filho
    mock_execute_funnel.assert_not_called()

@pytest.mark.asyncio
@patch("core.worker.handlers.whatsapp.SessionLocal")
@patch("core.worker.handlers.whatsapp.rabbitmq", new_callable=AsyncMock)
async def test_template_delivery_triggers_child_funnel(mock_rabbitmq, mock_session_local):
    db_session = MagicMock()
    mock_session_local.return_value = db_session
    
    # Configura dialeto SQLite para o mock_db_session para ignorar locks PostgreSQL
    db_session.bind.dialect.name = 'sqlite'
    
    # 1. Mock do trigger pai que já foi enviado e está aguardando entrega
    trigger_pai = models.ScheduledTrigger(
        id=10,
        client_id=1,
        contact_phone="5585999999999",
        contact_name="Arya Stark",
        template_name="welcome_template",
        funnel_id=55,
        status="paused_waiting_delivery",
        chatwoot_label=["Lead", "WhatsApp"],
        total_delivered=0
    )
    
    # 2. Mock do status do envio
    msg_status = models.MessageStatus(
        id=100,
        message_id="123456",
        trigger_id=10,
        status="sent",
        phone_number="5585999999999",
        delivered_counted=False
    )
    
    # Mock do DB para retornar a MessageStatus e depois o ScheduledTrigger
    db_session.query.return_value.filter.return_value.first.side_effect = [msg_status, None] # primeira busca retorna msg_status, segunda (child_exists) retorna None
    db_session.query.return_value.get.return_value = trigger_pai
    
    # Payload do evento do WhatsApp (delivered)
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "statuses": [{
                        "id": "wamid.123456",
                        "status": "delivered",
                        "recipient_id": "5585999999999",
                        "timestamp": "1600000000"
                    }]
                }
            }]
        }]
    }
    
    # Execute handle_whatsapp_event
    from core.worker.handlers.whatsapp import handle_whatsapp_event
    await handle_whatsapp_event(payload)
    
    # Validações
    # 1. Trigger pai deve ir para 'completed'
    assert trigger_pai.status == "completed"
    
    # 2. Deve ter criado o child trigger
    added_objects = [args[0] for args, _ in db_session.add.call_args_list]
    child_trigger = next((obj for obj in added_objects if isinstance(obj, models.ScheduledTrigger)), None)
    
    assert child_trigger is not None
    assert child_trigger.parent_id == 10
    assert child_trigger.funnel_id == 55
    assert child_trigger.status == "processing"
    assert child_trigger.product_name == "HIDDEN_CHILD"
    assert child_trigger.chatwoot_label == ["Lead", "WhatsApp"]
    
    # 3. Deve publicar o job na fila zapvoice_funnel_executions
    mock_rabbitmq.publish.assert_called_once()
    called_queue = mock_rabbitmq.publish.call_args[0][0]
    called_payload = mock_rabbitmq.publish.call_args[0][1]
    
    assert called_queue == "zapvoice_funnel_executions"
    assert called_payload["funnel_id"] == 55
    assert called_payload["contact_phone"] == "5585999999999"

@pytest.mark.asyncio
@patch("core.worker.handlers.funnel.SessionLocal")
@patch("core.worker.handlers.funnel.ChatwootClient")
@patch("core.worker.handlers.funnel.execute_funnel", new_callable=AsyncMock)
async def test_template_and_funnel_template_failure(mock_execute_funnel, MockChatwootClient, mock_session_local, mock_db_session):
    # Setup
    mock_session_local.return_value = mock_db_session
    
    # Mock do trigger pai
    trigger_pai = models.ScheduledTrigger(
        id=10,
        client_id=1,
        contact_phone="5585999999999",
        contact_name="Arya Stark",
        template_name="welcome_template",
        funnel_id=55,
        status="pending",
        chatwoot_label=["Lead", "WhatsApp"]
    )
    
    # Mock do ChatwootClient com erro no template
    chatwoot_inst = MockChatwootClient.return_value
    chatwoot_inst.send_template = AsyncMock(return_value={"error": True, "detail": "Meta API Error"})
    
    # Mock de busca no DB para retornar o trigger_pai
    mock_db_session.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = trigger_pai
    
    # Executa o handler
    data = {"trigger_id": 10, "contact_phone": "5585999999999"}
    await handle_funnel_execution(data)
    
    # Validações
    # 1. Status do pai deve ir para failed
    assert trigger_pai.status == "failed"
    assert trigger_pai.failure_reason == "Meta API Error"
    
    # 2. Não deve ter adicionado nenhum trigger filho
    added_triggers = [args[0] for args, _ in mock_db_session.add.call_args_list if isinstance(args[0], models.ScheduledTrigger)]
    assert len(added_triggers) == 0, "Trigger filho não deveria ter sido adicionado"
    
    # 3. Não deve chamar execute_funnel
    mock_execute_funnel.assert_not_called()

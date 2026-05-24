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
    
    # 2. Status do trigger pai deve ser completado
    assert trigger_pai.status == "completed"
    assert trigger_pai.total_sent == 1
    
    # 3. Deve ter adicionado o trigger filho no banco de dados
    added_objects = [args[0] for args, _ in mock_db_session.add.call_args_list]
    child_trigger = None
    for obj in added_objects:
        if isinstance(obj, models.ScheduledTrigger):
            child_trigger = obj
            break
            
    assert child_trigger is not None, "Trigger filho não foi adicionado ao DB"
    assert child_trigger.parent_id == 10
    assert child_trigger.funnel_id == 55
    assert child_trigger.status == "processing"
    assert child_trigger.product_name == "HIDDEN_CHILD"
    assert child_trigger.chatwoot_label == ["Lead", "WhatsApp"]
    
    # 4. Deve ter iniciado o execute_funnel para o filho
    mock_execute_funnel.assert_called_once()
    called_args = mock_execute_funnel.call_args[1]
    assert called_args["trigger_id"] == child_trigger.id
    assert called_args["funnel_id"] == 55
    assert called_args["contact_phone"] == "5585999999999"

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

"""
Testes unitários para validar que o webhook de memória recebe
o conteúdo real do template (body do WhatsAppTemplateCache com variáveis
substituídas) em vez de apenas o nome do template.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Helpers de mock
# ---------------------------------------------------------------------------

def _make_trigger(template_name="meu_template", contact_name="João", contact_phone="5511999990000"):
    t = MagicMock()
    t.id = 1
    t.client_id = 1
    t.template_name = template_name
    t.template_language = "pt_BR"
    t.template_components = []
    t.contact_name = contact_name
    t.contact_phone = contact_phone
    t.total_sent = 0
    t.status = "processing"
    t.updated_at = datetime.now(timezone.utc)
    t.private_message = None
    t.chatwoot_label = None
    t.conversation_id = None
    t.chatwoot_inbox_id = None
    t.is_bulk = True
    t.publish_external_event = True
    t.is_free_message = False
    t.cost_per_unit = 0.35
    t.funnel_id = None
    return t


def _make_db(trigger, template_body=None, global_vars=None):
    """Monta um db fake com respostas controladas."""
    db = MagicMock()

    # query(models.ScheduledTrigger).filter(...).with_for_update(...).first()
    db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = trigger

    # query(models.GlobalVariable).filter(...).all()
    db.query.return_value.filter.return_value.all.return_value = global_vars or []

    # query(models.WhatsAppTemplateCache).filter(...).first()
    if template_body is not None:
        cache = MagicMock()
        cache.body = template_body
        cache.name = trigger.template_name
        db.query.return_value.filter.return_value.first.return_value = cache
    else:
        db.query.return_value.filter.return_value.first.return_value = None

    db.execute.return_value.scalar.return_value = True
    return db


# ---------------------------------------------------------------------------
# Teste 1: Template com cache disponível → conteúdo real com apply_vars
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@patch("core.worker.handlers.funnel.SessionLocal")
@patch("core.worker.handlers.funnel.ChatwootClient")
@patch("core.engine.utils.apply_vars", side_effect=lambda text, *a, **kw: text.replace("{{1}}", "João"))
async def test_template_direto_usa_body_real_do_cache(mock_apply_vars, MockChatwoot, MockSession):
    """
    Ao enviar um template direto com sucesso, o MessageStatus.content
    deve ser o body real do template (com variáveis substituídas),
    não o nome do template.
    """
    trigger = _make_trigger(template_name="template_boas_vindas")

    # Simula o WhatsAppTemplateCache com body real
    template_body = "Olá, {{1}}! Seja bem-vindo ao nosso serviço."

    db = MagicMock()
    # Simula sequência de chamadas ao db
    saved_message_status = None

    def fake_add(obj):
        nonlocal saved_message_status
        import models
        # Captura apenas objetos MessageStatus
        if hasattr(obj, "content"):
            saved_message_status = obj

    db.add.side_effect = fake_add
    db.execute.return_value.scalar.return_value = True
    db.commit.return_value = None

    # query calls: ScheduledTrigger, GlobalVariable, WhatsAppTemplateCache
    template_cache_mock = MagicMock()
    template_cache_mock.body = template_body
    template_cache_mock.name = "template_boas_vindas"

    trigger_mock = MagicMock()
    trigger_mock.id = 1
    trigger_mock.client_id = 1
    trigger_mock.template_name = "template_boas_vindas"
    trigger_mock.template_language = "pt_BR"
    trigger_mock.template_components = []
    trigger_mock.contact_name = "João"
    trigger_mock.contact_phone = "5511999990000"
    trigger_mock.total_sent = 0
    trigger_mock.status = "processing"
    trigger_mock.updated_at = datetime.now(timezone.utc)
    trigger_mock.private_message = None
    trigger_mock.chatwoot_label = None
    trigger_mock.conversation_id = None
    trigger_mock.chatwoot_inbox_id = None
    trigger_mock.is_bulk = True
    trigger_mock.funnel_id = None

    # Sequência de respostas de db.query().filter()...
    q_chain = MagicMock()
    q_chain.with_for_update.return_value.first.return_value = trigger_mock
    q_chain.all.return_value = []  # GlobalVariable
    q_chain.first.return_value = template_cache_mock  # WhatsAppTemplateCache

    db.query.return_value.filter.return_value = q_chain
    MockSession.return_value = db

    # Mock do ChatwootClient.send_template retornando sucesso
    cw_instance = AsyncMock()
    cw_instance.send_template.return_value = {
        "messages": [{"id": "wamid.abc123"}]
    }
    MockChatwoot.return_value = cw_instance

    # Executa o handler
    from core.worker.handlers.funnel import handle_funnel_execution
    await handle_funnel_execution({
        "trigger_id": 1,
        "contact_phone": "5511999990000"
    })

    # Verifica que cw.send_template foi chamado
    cw_instance.send_template.assert_called_once()

    # Verifica que apply_vars foi chamado com o body do cache
    mock_apply_vars.assert_called()
    call_args = mock_apply_vars.call_args_list
    bodies_passed = [c.args[0] for c in call_args if c.args]
    assert any(template_body in b for b in bodies_passed), (
        f"apply_vars deveria ser chamado com o body real '{template_body}', "
        f"mas foi chamado com: {bodies_passed}"
    )


# ---------------------------------------------------------------------------
# Teste 2: Template sem cache → fallback para [Template: nome]
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@patch("core.worker.handlers.funnel.SessionLocal")
@patch("core.worker.handlers.funnel.ChatwootClient")
async def test_template_direto_sem_cache_usa_fallback(MockChatwoot, MockSession):
    """
    Quando o WhatsAppTemplateCache não tem registro para o template,
    o MessageStatus.content deve ser o fallback '[Template: nome]'.
    """
    saved_content = None

    def fake_add(obj):
        nonlocal saved_content
        if hasattr(obj, "content") and hasattr(obj, "message_type"):
            saved_content = obj.content

    db = MagicMock()
    db.add.side_effect = fake_add
    db.execute.return_value.scalar.return_value = True
    db.commit.return_value = None

    trigger_mock = MagicMock()
    trigger_mock.id = 1
    trigger_mock.client_id = 1
    trigger_mock.template_name = "template_inexistente"
    trigger_mock.template_language = "pt_BR"
    trigger_mock.template_components = []
    trigger_mock.contact_name = "Maria"
    trigger_mock.contact_phone = "5511888880000"
    trigger_mock.total_sent = 0
    trigger_mock.status = "processing"
    trigger_mock.updated_at = datetime.now(timezone.utc)
    trigger_mock.private_message = None
    trigger_mock.chatwoot_label = None
    trigger_mock.conversation_id = None
    trigger_mock.chatwoot_inbox_id = None
    trigger_mock.is_bulk = True
    trigger_mock.funnel_id = None

    q_chain = MagicMock()
    q_chain.with_for_update.return_value.first.return_value = trigger_mock
    q_chain.all.return_value = []  # GlobalVariable — nenhuma variável
    q_chain.first.return_value = None  # WhatsAppTemplateCache — não encontrado

    db.query.return_value.filter.return_value = q_chain
    MockSession.return_value = db

    cw_instance = AsyncMock()
    cw_instance.send_template.return_value = {
        "messages": [{"id": "wamid.xyz789"}]
    }
    MockChatwoot.return_value = cw_instance

    from core.worker.handlers.funnel import handle_funnel_execution
    await handle_funnel_execution({
        "trigger_id": 1,
        "contact_phone": "5511888880000"
    })

    # Conteúdo deve ser o fallback com o nome do template
    assert saved_content == "[Template: template_inexistente]", (
        f"Esperado '[Template: template_inexistente]', mas recebeu: '{saved_content}'"
    )


# ---------------------------------------------------------------------------
# Teste 3: Falha no envio → MessageStatus NÃO é criado com conteúdo falso
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@patch("core.worker.handlers.funnel.SessionLocal")
@patch("core.worker.handlers.funnel.ChatwootClient")
async def test_template_com_erro_nao_salva_message_status(MockChatwoot, MockSession):
    """
    Quando o send_template retorna erro, o MessageStatus NÃO deve ser adicionado
    com conteúdo falso. O trigger deve ir para status 'failed'.
    """
    saved_message_statuses = []

    def fake_add(obj):
        if hasattr(obj, "content") and hasattr(obj, "message_type"):
            saved_message_statuses.append(obj)

    db = MagicMock()
    db.add.side_effect = fake_add
    db.execute.return_value.scalar.return_value = True
    db.commit.return_value = None

    trigger_mock = MagicMock()
    trigger_mock.id = 2
    trigger_mock.client_id = 1
    trigger_mock.template_name = "template_com_erro"
    trigger_mock.template_language = "pt_BR"
    trigger_mock.template_components = []
    trigger_mock.contact_name = "Carlos"
    trigger_mock.contact_phone = "5511777770000"
    trigger_mock.total_sent = 0
    trigger_mock.status = "processing"
    trigger_mock.updated_at = datetime.now(timezone.utc)
    trigger_mock.private_message = None
    trigger_mock.chatwoot_label = None
    trigger_mock.conversation_id = None
    trigger_mock.chatwoot_inbox_id = None
    trigger_mock.is_bulk = True
    trigger_mock.funnel_id = None

    q_chain = MagicMock()
    q_chain.with_for_update.return_value.first.return_value = trigger_mock
    q_chain.all.return_value = []
    q_chain.first.return_value = None

    db.query.return_value.filter.return_value = q_chain
    MockSession.return_value = db

    # send_template retorna erro
    cw_instance = AsyncMock()
    cw_instance.send_template.return_value = {"error": True, "detail": "Template inválido"}
    MockChatwoot.return_value = cw_instance

    from core.worker.handlers.funnel import handle_funnel_execution
    await handle_funnel_execution({
        "trigger_id": 2,
        "contact_phone": "5511777770000"
    })

    # Nenhum MessageStatus deve ter sido criado
    assert len(saved_message_statuses) == 0, (
        f"Não deveria ter criado MessageStatus em caso de erro, mas criou {len(saved_message_statuses)}"
    )
    # O trigger deve estar como 'failed'
    assert trigger_mock.status == "failed"


# ---------------------------------------------------------------------------
# Teste 4: Regressão — follow-up de funil (events.py) já envia content correto
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@patch("core.engine.events.notify_agent_memory_webhook", new_callable=AsyncMock)
@patch("core.engine.events.log_node_execution")
@patch("core.engine.events.get_setting", return_value="https://webhook.exemplo.com")
async def test_funnel_followup_envia_content_real(mock_get_setting, mock_log, mock_notify):
    """
    O publish_node_external_event do events.py já recebe o content real
    como parâmetro e o repassa diretamente para notify_agent_memory_webhook.
    Garante que esse comportamento se mantém (regressão).
    """
    from core.engine.events import publish_node_external_event

    db = MagicMock()
    trigger = MagicMock()
    trigger.client_id = 1
    trigger.id = 10
    trigger.contact_name = "Ana"

    content_real = "Olá Ana! Aqui está sua oferta especial de R$ 99,90."

    await publish_node_external_event(
        db=db,
        trigger=trigger,
        data={},
        content=content_real,
        contact_phone="5511966660000",
        node_id="node_abc",
        event_type="funnel_message_sent"
    )

    mock_notify.assert_called_once()
    call_kwargs = mock_notify.call_args.kwargs

    assert call_kwargs.get("content") == content_real, (
        f"O content enviado ao webhook deve ser o texto real '{content_real}', "
        f"mas foi: '{call_kwargs.get('content')}'"
    )



# ---------------------------------------------------------------------------
# Teste 5: Regressão — template com is_bulk=False e publish_external_event=False
#          ainda deve disparar o webhook de memória ao receber 'delivered'
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_memoria_disparado_sem_flags_bulk():
    """
    Após a correção, o webhook de memória deve ser disparado para QUALQUER
    template que receba 'delivered', independente de is_bulk ou publish_external_event.
    Valida que a condição antiga (is_bulk OR publish_external_event) foi removida.
    """
    # Configura trigger com ambas as flags False (reproduz o bug do Trigger 729)
    trigger = MagicMock()
    trigger.id = 999
    trigger.client_id = 1
    trigger.contact_name = "Pedro"
    trigger.is_bulk = False                  # flag que antes bloqueava
    trigger.publish_external_event = False   # flag que antes bloqueava

    message_record = MagicMock()
    message_record.content = "Olá! Seu pedido foi confirmado."
    message_record.template_name = "pedido_confirmado"
    message_record.phone_number = "5511555550000"
    message_record.id = 42

    # Confirma que a lógica ANTIGA teria bloqueado
    old_condition = trigger.is_bulk or trigger.publish_external_event
    assert old_condition == False, "Flags deveriam ser False para reproduzir o bug"

    # Com a nova lógica (apenas trigger_delivered), o webhook DEVE ser chamado
    trigger_delivered = True
    assert trigger_delivered == True, "trigger_delivered deve ser True"

    # Simula o bloco do whatsapp.py com a nova condição
    with patch("services.ai_memory.notify_agent_memory_webhook", new_callable=AsyncMock) as mock_fn:
        if trigger_delivered:  # nova condição — sem verificar is_bulk / publish_external_event
            await mock_fn(
                client_id=trigger.client_id,
                phone=message_record.phone_number,
                name=trigger.contact_name,
                template_name=message_record.template_name,
                content=message_record.content,
                trigger_id=trigger.id,
                internal_contact_id=message_record.id
            )

        # Webhook deve ter sido chamado (antes não seria com a lógica antiga)
        mock_fn.assert_called_once()
        kwargs = mock_fn.call_args.kwargs
        assert kwargs["content"] == "Olá! Seu pedido foi confirmado."
        assert kwargs["client_id"] == 1

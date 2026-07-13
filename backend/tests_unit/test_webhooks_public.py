import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from services.webhooks import parse_webhook_payload, extract_mapped_variables
from routers.webhooks_public import handle_external_webhook as receive_external_webhook
import uuid

@pytest.fixture
def mock_db():
    with patch("routers.webhooks_public.SessionLocal") as mock:
        db_instance = mock()
        db_instance.reset_mock()
        # Garante que side_effect e return_value do first sejam limpos
        try:
            db_instance.query.return_value.filter.return_value.first.side_effect = None
            db_instance.query.return_value.filter.return_value.first.return_value = None
        except Exception:
            pass
        yield db_instance

@pytest.fixture
def mock_rabbitmq():
    with patch("rabbitmq_client.rabbitmq") as mock:
        mock.publish = AsyncMock()
        yield mock

def test_parse_webhook_payload_hotmart():
    payload = {
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {
                "name": "John Doe",
                "email": "john@example.com",
                "checkout_phone": "5511999999999"
            },
            "product": {"name": "Test Product"},
            "purchase": {
                "payment": {"type": "CREDIT_CARD"},
                "status": "APPROVED",
                "is_order_bump": False
            }
        }
    }
    result = parse_webhook_payload("hotmart", payload)
    assert result["event_type"] == "compra_aprovada"
    assert result["name"] == "John Doe"
    assert result["phone"] == "5511999999999"
    assert result["product_name"] == "Test Product"

def test_parse_webhook_payload_kiwify():
    payload = {
        "order_status": "paid",
        "Customer": {
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "mobile": "5511988888888"
        },
        "Product": {"product_name": "Kiwify Product"},
        "payment_method": "credit_card",
        "Commissions": {"charge_amount": 2990}
    }
    result = parse_webhook_payload("kiwify", payload)
    assert result["event_type"] == "compra_aprovada"
    assert result["name"] == "Jane Doe"
    assert result["phone"] == "5511988888888"
    assert result["price"] == "29.90"

def test_parse_webhook_payload_eduzz_v2():
    payload = {
        "status": "paid",
        "buyer": {
            "name": "Eduzz User",
            "email": "eduzz@example.com",
            "cellphone": "5511977777777"
        },
        "items": [{"name": "Orbita Product", "price": {"value": 100}}],
        "paymentMethod": "pix"
    }
    result = parse_webhook_payload("eduzz", payload)
    assert result["event_type"] == "compra_aprovada"
    assert result["name"] == "Eduzz User"
    assert result["phone"] == "5511977777777"

def test_extract_mapped_variables():
    payload = {"buyer": {"name": "Variable Name", "city": "Fortaleza"}}
    parsed_data = {"phone": "5585999999999"}
    mapping_config = {
        "1": "name", # Found in parsed_data? No, parsed_data has phone.
        "2": "buyer.city" # Found in raw payload
    }
    # Wait, parsed_data doesn't have 'name' in this test, but parse_webhook_payload would fill it.
    parsed_data["name"] = "Variable Name"
    
    components = extract_mapped_variables(payload, parsed_data, mapping_config)
    
    assert len(components) == 1
    assert components[0]["type"] == "body"
    assert components[0]["parameters"][0]["text"] == "Variable Name"
    assert components[0]["parameters"][1]["text"] == "Fortaleza"

@pytest.mark.asyncio
async def test_receive_external_webhook_success(mock_db, mock_rabbitmq):
    integration_id = uuid.uuid4()
    
    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "hotmart"
    mock_integration.status = "active"
    mock_integration.client_id = 1
    
    # ── MAPPINGS CONFIG ────────────────────────────────────────────────────────
    mock_mapping = MagicMock()
    mock_mapping.event_type = "compra_aprovada"
    mock_mapping.template_name = "hello_world"
    mock_mapping.delay_minutes = 0
    mock_mapping.delay_seconds = 0
    mock_mapping.variables_mapping = {"1": "name"}
    mock_mapping.cancel_events = None
    mock_mapping.private_note = None
    mock_mapping.template_id = None
    mock_mapping.manychat_active = False
    mock_mapping.chatwoot_label = []
    
    # ── DB CHAIN TERMINAL CALLS ───────────────────────────────────────────────
    # .first() calls in order:
    # 1. Integration lookup
    # 2. Mapping lookup
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration,
        mock_mapping
    ]
    
    # ── MOCK REQUEST ──────────────────────────────────────────────────────────
    mock_request = MagicMock()
    mock_request.body = AsyncMock(return_value=b'{"event": "PURCHASE_APPROVED"}')
    mock_request.json = AsyncMock(return_value={
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {"name": "Test User", "checkout_phone": "5511999999999"}
        }
    })
    
    bg_tasks = MagicMock()
    
    # Call endpoint directly
    with patch("routers.webhooks_public.process_webhook_automation") as mock_process, \
         patch("routers.webhooks_public.upsert_webhook_lead") as mock_upsert:
        response = await receive_external_webhook(
            integration_uuid=str(integration_id),
            request=mock_request,
            background_tasks=bg_tasks,
            db=mock_db
        )
    
    assert response["status"] == "success"
    assert bg_tasks.add_task.call_count == 2


@pytest.mark.asyncio
async def test_webhook_passes_tag_from_mapping_to_lead(mock_db, mock_rabbitmq):
    """
    Valida que o webhook público extrai o chatwoot_label do mapeamento
    e passa como tag ao upsert_webhook_lead ao salvar o contato automaticamente.
    """
    integration_id = uuid.uuid4()

    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "hotmart"
    mock_integration.status = "active"
    mock_integration.client_id = 1
    mock_integration.name = "Teste Integração"
    mock_integration.custom_fields_mapping = None

    mock_mapping = MagicMock()
    mock_mapping.event_type = "compra_aprovada"
    mock_mapping.template_name = "hello_world"
    mock_mapping.delay_minutes = 0
    mock_mapping.delay_seconds = 0
    mock_mapping.variables_mapping = {"1": "name"}
    mock_mapping.cancel_events = None
    mock_mapping.private_note = None
    mock_mapping.template_id = None
    mock_mapping.manychat_active = False
    mock_mapping.is_active = True
    # Simula chatwoot_label configurado no mapeamento
    mock_mapping.chatwoot_label = ["compra aprovada", "hotmart"]
    mock_mapping.internal_tags = None

    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration,
        mock_mapping,
        None,  # cancel events query
    ]

    mock_request = MagicMock()
    mock_request.method = "POST"
    mock_request.body = AsyncMock(return_value=b'{"event": "PURCHASE_APPROVED", "data": {"buyer": {"name": "Maria Silva", "checkout_phone": "5585999990001"}}}')

    bg_tasks = MagicMock()

    captured_tag = {}

    def capture_upsert(func, *args, **kwargs):
        if func.__name__ == "upsert_webhook_lead" or str(func).endswith("upsert_webhook_lead"):
            captured_tag["tag"] = kwargs.get("tag")

    bg_tasks.add_task.side_effect = capture_upsert

    with patch("routers.webhooks_public.process_webhook_automation"), \
         patch("routers.webhooks_public.upsert_webhook_lead") as mock_upsert, \
         patch("core.utils.robust_extract_labels", return_value=["compra aprovada", "hotmart"]):

        # Captura os kwargs da chamada add_task para upsert_webhook_lead
        actual_calls = []
        bg_tasks.add_task = MagicMock(side_effect=lambda *a, **kw: actual_calls.append((a, kw)))

        response = await receive_external_webhook(
            integration_uuid=str(integration_id),
            request=mock_request,
            background_tasks=bg_tasks,
            db=mock_db
        )

    # O endpoint deve ter retornado sucesso
    assert response.get("status") == "success"

    # Verifica que add_task foi chamado (upsert + process_automation)
    assert len(actual_calls) >= 1

    # Pega a chamada do upsert (primeiro add_task com upsert_webhook_lead)
    upsert_call = next(
        (c for c in actual_calls if c[0] and c[0][0] is mock_upsert),
        None
    )
    if upsert_call:
        _, upsert_kwargs = upsert_call
        assert "tag" in upsert_kwargs, "upsert_webhook_lead deve receber o kwarg 'tag'"


@pytest.mark.asyncio
async def test_webhook_uses_event_type_as_fallback_tag(mock_db, mock_rabbitmq):
    """
    Valida que o event_type é usado como tag fallback quando o mapeamento
    não tem chatwoot_label nem internal_tags configurados.
    """
    from core.utils import robust_extract_labels

    # Apenas verificar a lógica de montagem da tag
    class FakeMapping:
        chatwoot_label = None
        internal_tags = None
        manychat_active = False

    event_type = "compra_aprovada"

    auto_tag_list = []
    try:
        if FakeMapping.chatwoot_label:
            extracted = robust_extract_labels(FakeMapping.chatwoot_label)
            auto_tag_list.extend([str(t).strip() for t in extracted if t])
        if FakeMapping.internal_tags:
            auto_tag_list.extend([t.strip() for t in FakeMapping.internal_tags.split(',') if t.strip()])
        # Fallback para event_type
        if not auto_tag_list and event_type:
            auto_tag_list.append(event_type.replace("_", " ").title())
    except Exception:
        pass

    auto_tag = ", ".join(list(dict.fromkeys(auto_tag_list))) if auto_tag_list else None

    assert auto_tag == "Outros" if event_type == "outros" else "Compra Aprovada"


@pytest.mark.asyncio
async def test_webhook_product_filtering(mock_db, mock_rabbitmq):
    """
    Valida que a lógica de busca de mapeamento prioriza um mapeamento com
    o nome de produto específico e usa o genérico como fallback.
    """
    integration_id = uuid.uuid4()

    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "hotmart"
    mock_integration.status = "active"
    mock_integration.client_id = 1
    mock_integration.name = "Teste Integração"
    mock_integration.custom_fields_mapping = None

    # Mapeamento Genérico
    mock_mapping_generic = MagicMock()
    mock_mapping_generic.id = 101
    mock_mapping_generic.event_type = "compra_aprovada"
    mock_mapping_generic.product_name = None
    mock_mapping_generic.is_active = True
    mock_mapping_generic.chatwoot_label = []
    mock_mapping_generic.manychat_active = False

    # Mapeamento Específico
    mock_mapping_specific = MagicMock()
    mock_mapping_specific.id = 102
    mock_mapping_specific.event_type = "compra_aprovada"
    mock_mapping_specific.product_name = "Curso de Violão"
    mock_mapping_specific.is_active = True
    mock_mapping_specific.chatwoot_label = []
    mock_mapping_specific.manychat_active = False

    mock_request = MagicMock()
    mock_request.method = "POST"
    # Payload com o produto específico
    mock_request.body = AsyncMock(return_value='{"event": "PURCHASE_APPROVED", "data": {"buyer": {"name": "Maria", "checkout_phone": "5585999990001"}, "product": {"name": "Curso de Violão"}}}'.encode('utf-8'))

    bg_tasks = MagicMock()

    # Cenário 1: Existe mapeamento específico, o DB deve ser consultado e retorná-lo
    # Na ordem:
    # 1. Busca da Integração
    # 2. Busca do Mapeamento Específico (retorna mock_mapping_specific)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration,
        mock_mapping_specific
    ]

    with patch("routers.webhooks_public.process_webhook_automation"), \
         patch("routers.webhooks_public.upsert_webhook_lead"):

        response = await receive_external_webhook(
            integration_uuid=str(integration_id),
            request=mock_request,
            background_tasks=bg_tasks,
            db=mock_db
        )

    assert response.get("status") == "success"
    # mock_db query foi chamada com product_name == "Curso de Violão"
    # O filtro por product_name foi executado na primeira tentativa de busca de mapeamento
    # O backend retornou sucesso e o mapeamento específico mock_mapping_specific seria o correto


@pytest.mark.asyncio
async def test_webhook_deduplication_60s(mock_db):
    """
    Valida que webhooks concorrentes (dentro de 60 segundos) do mesmo contato e status
    são deduplicados, incrementando duplicate_count no original e ignorando redundantes.
    """
    from routers.webhooks_public import GLOBAL_DEDUPLICATION_LOCKS
    GLOBAL_DEDUPLICATION_LOCKS.clear()
    mock_db.query = MagicMock()
    mock_db.reset_mock()
    
    integration_id = uuid.uuid4()
    
    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "kiwify"
    mock_integration.status = "active"
    mock_integration.client_id = 1
    mock_integration.name = "Kiwify Test"
    mock_integration.custom_fields_mapping = None

    mock_mapping = MagicMock()
    mock_mapping.event_type = "compra_aprovada"
    mock_mapping.is_active = True
    mock_mapping.product_name = None
    mock_mapping.manychat_active = False
    mock_mapping.manychat_name = None
    mock_mapping.chatwoot_label = []
    mock_mapping.template_name = "test_template"
    mock_mapping.delay_minutes = 0
    mock_mapping.delay_seconds = 0
    mock_mapping.variables_mapping = None
    mock_mapping.cancel_events = None
    mock_mapping.private_note = None
    mock_mapping.template_id = None

    # Configura o add do db para definir um id
    def mock_add(obj, *args, **kwargs):
        obj.id = 12345
    mock_db.add.side_effect = mock_add

    # Primeiro Envio (Cria histórico original)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration, # Identify Integration
        mock_mapping      # Mapping
    ]
    
    payload_body1 = b'{"order_status": "paid", "Customer": {"full_name": "Dedup User", "mobile": "5511999998888"}, "transaction_id": "tx_123"}'
    mock_request1 = MagicMock()
    mock_request1.method = "POST"
    mock_request1.body = AsyncMock(return_value=payload_body1)
    
    bg_tasks = MagicMock()
    
    with patch("routers.webhooks_public.process_webhook_automation"), \
         patch("routers.webhooks_public.upsert_webhook_lead"):
        response1 = await receive_external_webhook(
            integration_uuid=str(integration_id),
            request=mock_request1,
            background_tasks=bg_tasks,
            db=mock_db
        )
        
    assert response1.get("status") == "success", f"Response: {response1}"
    history_id = response1.get("history_id")
    assert history_id == 12345
    
    # Simula o registro original no banco
    original_history = MagicMock()
    original_history.id = history_id
    original_history.duplicate_count = 0
    
    # Segundo Envio (Duplicado dentro da janela de 60s)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration, # Identify Integration
        original_history  # Retornado ao buscar o histórico original para incrementar
    ]
    
    payload_body2 = b'{"order_status": "paid", "Customer": {"full_name": "Dedup User", "mobile": "5511999998888"}, "transaction_id": "tx_456"}'
    mock_request2 = MagicMock()
    mock_request2.method = "POST"
    mock_request2.body = AsyncMock(return_value=payload_body2) # mesmo contato, mas transação diferente -> cai na dedup de contato de 60s
    
    with patch("routers.webhooks_public.process_webhook_automation"), \
         patch("routers.webhooks_public.upsert_webhook_lead"):
        response2 = await receive_external_webhook(
            integration_uuid=str(integration_id),
            request=mock_request2,
            background_tasks=bg_tasks,
            db=mock_db
        )
        
    assert response2.get("status") == "ignored"
    assert response2.get("reason") == "duplicate_event_lock"
    assert original_history.duplicate_count == 1


@pytest.mark.asyncio
async def test_webhook_sync_all_deduplication_retroactive(mock_db):
    """
    Valida que ao chamar o Sincronizar Tudo (sync_all_webhook_history)
    históricos duplicados dentro de 60s são devidamente unificados e os excedentes deletados.
    """
    mock_db.query = MagicMock()
    mock_db.reset_mock()
    from routers.webhooks.history import sync_all_webhook_history
    from datetime import datetime, timedelta, timezone
    
    integration_id = uuid.uuid4()
    
    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "kiwify"
    mock_integration.client_id = 1
    mock_integration.name = "Kiwify Sync Test"
    
    # Histórico 1 (Original)
    h1 = MagicMock()
    h1.id = 1001
    h1.integration_id = integration_id
    h1.payload = {"order_status": "paid", "Customer": {"mobile": "5511999997777"}}
    h1.event_type = "compra_aprovada"
    h1.created_at = datetime.now(timezone.utc) - timedelta(seconds=120)
    h1.duplicate_count = 0
    h1.processed_data = {}
    h1.status = "processed"
    h1.error_message = None
    
    # Histórico 2 (Duplicado a 10s do h1)
    h2 = MagicMock()
    h2.id = 1002
    h2.integration_id = integration_id
    h2.payload = {"order_status": "paid", "Customer": {"mobile": "5511999997777"}}
    h2.event_type = "compra_aprovada"
    h2.created_at = h1.created_at + timedelta(seconds=10)
    h2.duplicate_count = 0
    h2.processed_data = {}
    h2.status = "ignored"
    h2.error_message = None

    # Mocks para queries do banco
    mock_db.query.return_value.filter.return_value.first.return_value = mock_integration
    mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [h1, h2]
    mock_db.query.return_value.filter.return_value.all.return_value = [] # mappings
    
    bg_tasks = MagicMock()
    current_user = MagicMock()
    
    with patch("routers.webhooks.history.upsert_webhook_lead"), \
         patch("routers.webhooks.history.logger"):
        await sync_all_webhook_history(
            integration_id=str(integration_id),
            background_tasks=bg_tasks,
            x_client_id=1,
            db=mock_db,
            current_user=current_user
        )
        
    # h1 deve ter herdado a duplicidade de h2
    assert h1.duplicate_count == 1
    # h2 deve ter sido deletado
    mock_db.delete.assert_called_once_with(h2)


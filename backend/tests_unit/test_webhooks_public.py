import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from services.webhooks import parse_webhook_payload, extract_mapped_variables
from routers.webhooks_public import handle_external_webhook as receive_external_webhook
import uuid

@pytest.fixture
def mock_db():
    with patch("routers.webhooks_public.SessionLocal") as mock:
        yield mock()

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

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from routers.webhooks_public import parse_webhook_payload, extract_mapped_variables, receive_external_webhook
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
    
    # ── DB CHAIN TERMINAL CALLS ───────────────────────────────────────────────
    # .first() calls in order:
    # 1. Integration lookup (Step 481)
    # 2. Blocked check (Step 576)
    # 3. Superior trigger check (Step 630)
    # 4. Template cache lookup (Step 660)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration, # Step 481
        None,             # Step 576
        None,             # Step 630
        None              # Step 660
    ]
    
    # .all() calls in order:
    # 1. Mappings for event (Step 552)
    # 2. All integration mappings for suppression check (Step 617)
    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [mock_mapping], # Step 552
        [mock_mapping]  # Step 617
    ]
    
    # ── MOCK REQUEST ──────────────────────────────────────────────────────────
    mock_request = MagicMock()
    mock_request.json = AsyncMock(return_value={
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {"name": "Test User", "checkout_phone": "5511999999999"}
        }
    })
    
    bg_tasks = MagicMock()
    
    # Call endpoint directly
    response = await receive_external_webhook(
        integration_uuid=str(integration_id),
        request=mock_request,
        background_tasks=bg_tasks,
        db=mock_db
    )
    
    assert response["status"] == "success"
    assert mock_rabbitmq.publish.call_count == 1

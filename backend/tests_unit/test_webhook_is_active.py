import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from routers.webhooks_public import handle_external_webhook as receive_external_webhook
import uuid
import models

@pytest.fixture
def mock_db():
    with patch("routers.webhooks_public.SessionLocal") as mock:
        yield mock()

@pytest.fixture
def mock_rabbitmq():
    with patch("rabbitmq_client.rabbitmq") as mock:
        mock.publish = AsyncMock()
        yield mock

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_receive_external_webhook_ignored_when_mapping_inactive(mock_db, mock_rabbitmq):
    integration_id = uuid.uuid4()
    
    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "hotmart"
    mock_integration.status = "active"
    mock_integration.client_id = 1
    
    # ── DB CHAIN TERMINAL CALLS ───────────────────────────────────────────────
    # 1. Integration lookup
    # 2. Mapping lookup (event_type)
    # 3. Mapping lookup (outros)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration,
        None,
        None
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
    response = await receive_external_webhook(
        integration_uuid=str(integration_id),
        request=mock_request,
        background_tasks=bg_tasks,
        db=mock_db
    )
    
    # Should be skipped because no ACTIVE mapping was found
    assert response["status"] == "skipped"
    assert "no_mapping_found" in response["reason"]
    assert mock_rabbitmq.publish.call_count == 0

@pytest.mark.anyio
async def test_receive_external_webhook_active_mapping_works(mock_db, mock_rabbitmq):
    with patch("routers.webhooks_public.upsert_webhook_lead") as mock_upsert:
        integration_id = uuid.uuid4()
        
        mock_integration = MagicMock()
        mock_integration.id = integration_id
        mock_integration.platform = "hotmart"
        mock_integration.status = "active"
        mock_integration.client_id = 1
        
        mock_active_mapping = MagicMock()
        mock_active_mapping.is_active = True
        mock_active_mapping.event_type = "compra_aprovada"
        mock_active_mapping.template_name = "hello_world"
        mock_active_mapping.delay_minutes = 0
        mock_active_mapping.delay_seconds = 0
        mock_active_mapping.variables_mapping = {"1": "name"}
        mock_active_mapping.cancel_events = None
        mock_active_mapping.private_note = None
        mock_active_mapping.template_id = None
        mock_active_mapping.manychat_active = False
        mock_active_mapping.chatwoot_label = []
        
        # 1. Integration lookup
        # 2. Blocked check
        # 3. Superior trigger check
        # 4. Template cache lookup
        # 1. Integration lookup
        # 2. Mapping lookup
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_integration,
            mock_active_mapping
        ]
        
        mock_request = MagicMock()
        mock_request.body = AsyncMock(return_value=b'{"event": "PURCHASE_APPROVED"}')
        mock_request.json = AsyncMock(return_value={
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {"name": "Test User", "checkout_phone": "5511999999999"}
            }
        })
        
        bg_tasks = MagicMock()
        
        with patch("routers.webhooks_public.process_webhook_automation") as mock_process:
            response = await receive_external_webhook(
                integration_uuid=str(integration_id),
                request=mock_request,
                background_tasks=bg_tasks,
                db=mock_db
            )
        
        assert response["status"] == "success"
        assert bg_tasks.add_task.call_count == 2

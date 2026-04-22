import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from routers.webhooks_public import receive_external_webhook
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
    # 2. Lead lookup (in upsert_webhook_lead)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration, # Integration lookup
        None,             # Lead lookup
    ]
    
    # ── MAPPINGS CONFIG (EMPTY because of is_active == True filter) ───────────
    # 1. Mappings for event (will be filtered by is_active=True in the query)
    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [], # No active mappings found
        []  # Suppressor check
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
    
    # Should be ignored because no ACTIVE mapping was found
    assert response["status"] == "ignored"
    assert "no_mapping_for_event" in response["reason"]
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
        
        # 1. Integration lookup
        # 2. Blocked check
        # 3. Superior trigger check
        # 4. Template cache lookup
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_integration, # Integration lookup (line 641)
            None,             # Blocked check (line 801)
            None,             # Superior trigger check (line 852)
            None              # Template cache lookup (line 889)
        ]
        
        # 1. Mappings for event
        # 2. All integration mappings for suppression check
        mock_db.query.return_value.filter.return_value.all.side_effect = [
            [mock_active_mapping], # Mappings for event (line 758)
            [mock_active_mapping]  # Suppressor check (line 839)
        ]
        
        mock_request = MagicMock()
        mock_request.json = AsyncMock(return_value={
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {"name": "Test User", "checkout_phone": "5511999999999"}
            }
        })
        
        bg_tasks = MagicMock()
        
        response = await receive_external_webhook(
            integration_uuid=str(integration_id),
            request=mock_request,
            background_tasks=bg_tasks,
            db=mock_db
        )
        
        assert response["status"] == "success"
        assert mock_rabbitmq.publish.call_count == 1
        assert mock_upsert.call_count == 1

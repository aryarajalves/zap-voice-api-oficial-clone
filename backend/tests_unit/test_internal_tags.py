import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from routers.webhooks_public import receive_external_webhook
import uuid

@pytest.fixture
def mock_db():
    with patch("routers.webhooks_public.SessionLocal") as mock:
        db = mock()
        # Mock the execute method for text() queries (migrations/logs)
        db.execute = MagicMock()
        yield db

@pytest.fixture
def mock_rabbitmq():
    with patch("rabbitmq_client.rabbitmq") as mock:
        mock.publish = AsyncMock()
        yield mock

@pytest.fixture
def mock_upsert_lead():
    with patch("routers.webhooks_public.upsert_webhook_lead") as mock:
        yield mock

@pytest.mark.asyncio
async def test_internal_tags_processing(mock_db, mock_rabbitmq, mock_upsert_lead):
    integration_id = uuid.uuid4()
    
    mock_integration = MagicMock()
    mock_integration.id = integration_id
    mock_integration.platform = "hotmart"
    mock_integration.status = "active"
    mock_integration.client_id = 1
    
    # Mapping 1: Chatwoot Label
    mock_mapping1 = MagicMock()
    mock_mapping1.event_type = "compra_aprovada"
    mock_mapping1.chatwoot_label = "label1"
    mock_mapping1.internal_tags = "tag1, tag2"
    mock_mapping1.template_id = None
    mock_mapping1.variables_mapping = {}
    mock_mapping1.cancel_events = None
    mock_mapping1.private_note = None
    
    # Mapping 2: Internal Tags only
    mock_mapping2 = MagicMock()
    mock_mapping2.event_type = "compra_aprovada"
    mock_mapping2.chatwoot_label = None
    mock_mapping2.internal_tags = "tag2, tag3"
    mock_mapping2.template_id = None
    mock_mapping2.variables_mapping = {}
    mock_mapping2.cancel_events = None
    mock_mapping2.private_note = None

    # Mock DB Queries
    # .first() calls
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_integration, # Integration lookup
        None,             # Blocked check
        None,             # Superior trigger check
        None              # Template cache
    ]
    
    # .all() calls
    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [mock_mapping1, mock_mapping2], # Mappings for event
        [mock_mapping1, mock_mapping2]  # All integration mappings
    ]
    
    mock_request = MagicMock()
    mock_request.json = AsyncMock(return_value={
        "event": "PURCHASE_APPROVED",
        "data": {
            "buyer": {"name": "Test User", "checkout_phone": "5511999999999"}
        }
    })
    
    bg_tasks = MagicMock()
    
    # Call endpoint
    await receive_external_webhook(
        integration_uuid=str(integration_id),
        request=mock_request,
        background_tasks=bg_tasks,
        db=mock_db
    )
    
    # Verify tags collection logic
    # Expected tags: label1, tag1, tag2, tag3 (unique and combined)
    # The order depends on how we implemented it: 
    # all_tags.extend([t.strip() for t in m.chatwoot_label.split(',') if t.strip()])
    # all_tags.extend([t.strip() for t in m.internal_tags.split(',') if t.strip()])
    # For Mapping 1: label1, tag1, tag2
    # For Mapping 2: tag2, tag3
    # Result unique: label1, tag1, tag2, tag3
    
    called_tag = mock_upsert_lead.call_args[1].get('tag')
    assert "label1" in called_tag
    assert "tag1" in called_tag
    assert "tag2" in called_tag
    assert "tag3" in called_tag
    
    # Check comma separation
    tags_list = [t.strip() for t in called_tag.split(',')]
    assert len(tags_list) == 4
    assert set(tags_list) == {"label1", "tag1", "tag2", "tag3"}

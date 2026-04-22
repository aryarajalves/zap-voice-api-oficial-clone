import pytest
from unittest.mock import MagicMock
from schemas import WebhookIntegrationCreate, FunnelCreate
from routers.webhooks_integrations import update_webhook_integration
from routers.funnels import update_funnel
import uuid

def test_webhook_integration_update_includes_slug():
    db = MagicMock()
    # Mock current integration in DB
    mock_int = MagicMock()
    mock_int.id = uuid.uuid4()
    db.query.return_value.filter.return_value.first.return_value = mock_int
    
    # Payload with slug
    update_data = WebhookIntegrationCreate(
        name="Test",
        platform="hotmart",
        custom_slug="my-custom-slug",
        mappings=[]
    )
    
    # Call update
    update_webhook_integration(
        integration_id=str(mock_int.id),
        integration_update=update_data,
        x_client_id=1,
        db=db,
        current_user=MagicMock()
    )
    
    # Verify the attribute was assigned
    assert mock_int.custom_slug == "my-custom-slug"

def test_funnel_update_includes_business_hours():
    db = MagicMock()
    # Mock current funnel
    mock_funnel = MagicMock()
    mock_funnel.id = 123
    db.query.return_value.filter.return_value.first.return_value = mock_funnel
    
    # Payload with business hours
    update_data = FunnelCreate(
        name="Test Funnel",
        steps=[],
        business_hours_start="10:00",
        business_hours_end="22:00",
        business_hours_days=[0, 1]
    )
    
    # Call update
    update_funnel(
        funnel_id=123,
        funnel_update=update_data,
        x_client_id=1,
        db=db,
        current_user=MagicMock()
    )
    
    # Verify attributes were assigned
    assert mock_funnel.business_hours_start == "10:00"
    assert mock_funnel.business_hours_end == "22:00"
    assert mock_funnel.business_hours_days == [0, 1]

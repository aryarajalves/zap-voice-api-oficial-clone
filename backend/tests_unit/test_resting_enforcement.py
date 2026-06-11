import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy.orm import Session
import models
from datetime import datetime, timedelta
from core.engine.executor import execute_funnel

@pytest.fixture
def mock_db():
    db = MagicMock(spec=Session)
    return db

@pytest.fixture
def mock_chatwoot():
    with patch("core.engine.executor.ChatwootClient", new_callable=MagicMock) as mock_class:
        mock_instance = mock_class.return_value
        mock_instance.ensure_conversation = AsyncMock(return_value=123)
        mock_instance.is_within_24h_window = AsyncMock(return_value=True)
        mock_instance.send_message = AsyncMock(return_value={"id": 1})
        yield mock_instance

@pytest.mark.asyncio
async def test_execute_funnel_resting_block(mock_db, mock_chatwoot):
    # Setup
    funnel_id = 1
    trigger_id = 100
    contact_phone = "5554999920144"
    
    # Mock Trigger
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = trigger_id
    mock_trigger.client_id = 1
    mock_trigger.status = 'queued'
    mock_trigger.current_node_id = None
    mock_trigger.total_sent = 0
    mock_trigger.chatwoot_label = None
    mock_trigger.private_message = None
    
    # Mock Funnel
    mock_funnel = MagicMock(spec=models.Funnel)
    mock_funnel.id = funnel_id
    mock_funnel.steps = {"nodes": [{"id": "start", "type": "start"}], "edges": []}
    
    # Mock DB Queries
    def side_effect(model):
        if model == models.Funnel:
            m = MagicMock()
            m.get.return_value = mock_funnel
            return m
        if model == models.ScheduledTrigger:
            m = MagicMock()
            m.filter.return_value.with_for_update.return_value.first.return_value = mock_trigger
            return m
        if model == models.BlockedContact:
            m = MagicMock()
            m.filter.return_value.first.return_value = None
            return m
        if model == models.RestingContact:
            # Simulate contact is resting
            mock_rest = MagicMock(spec=models.RestingContact)
            m = MagicMock()
            m.filter.return_value.first.return_value = mock_rest
            return m
        return MagicMock()

    mock_db.query.side_effect = side_effect

    # Execute
    await execute_funnel(funnel_id, 0, trigger_id, contact_phone, mock_db)

    # Verify
    assert mock_trigger.status == 'failed'
    assert mock_trigger.failure_reason == "Contato em Repouso"
    mock_chatwoot.send_message.assert_not_called()

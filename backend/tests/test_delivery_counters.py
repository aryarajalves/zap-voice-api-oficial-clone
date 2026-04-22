import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mocking database BEFORE engine imports
mock_db_module = MagicMock()
sys.modules["database"] = mock_db_module
mock_db_session = MagicMock()
mock_db_module.SessionLocal = MagicMock(return_value=mock_db_session)
mock_db_module.Base = MagicMock()

import models
from services.engine import execute_graph_funnel

@pytest.mark.anyio
async def test_engine_increments_total_sent():
    # Setup trigger
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.id = 1
    trigger.client_id = 1
    trigger.contact_phone = "5511999999999"
    trigger.status = "processing"
    trigger.total_sent = 0
    trigger.conversation_id = 0
    trigger.current_node_id = "node1"
    
    # Mock database session methods
    mock_db_session.query.return_value.get.return_value = trigger
    mock_db_session.query.return_value.filter_by.return_value.first.return_value = None
    
    # Mock ChatwootClient
    mock_chatwoot = MagicMock()
    mock_chatwoot.send_text_official = AsyncMock(return_value={"messages": [{"id": "wamid.123"}]})
    
    # Graph data with one message node
    graph_data = {
        "nodes": [
            {"id": "node1", "type": "message", "data": {"content": "Hello"}}
        ],
        "edges": []
    }
    
    # Mock helpers
    with patch("services.engine.get_best_conversation", new_callable=AsyncMock, return_value=0), \
         patch("services.engine.is_window_open_strict", new_callable=AsyncMock, return_value=True), \
         patch("services.engine.publish_node_external_event", new_callable=AsyncMock, return_value=None):
        
        # Apply_vars dummy
        apply_vars = lambda x, **kwargs: x
        
        # Call the engine function
        # Signature: execute_graph_funnel(trigger, graph_data, chatwoot, conversation_id, contact_phone, db, apply_vars, chatwoot_contact_id=None)
        await execute_graph_funnel(trigger, graph_data, mock_chatwoot, 0, "5511999999999", mock_db_session, apply_vars)
        
        # Verify total_sent was incremented
        assert trigger.total_sent == 1
        assert mock_db_session.commit.called

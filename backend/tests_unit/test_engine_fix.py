import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone
from services.engine import execute_graph_funnel
import models

@pytest.mark.asyncio
async def test_action_node_execution():
    # Setup mocks
    db = MagicMock()
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.id = 1
    trigger.current_node_id = "node_action"
    trigger.status = "processing"
    trigger.client_id = 1
    trigger.contact_name = "Test User"
    trigger.contact_phone = "5511999999999"
    trigger.execution_history = []
    
    graph_data = {
        "nodes": [
            {
                "id": "node_action",
                "type": "actionNode",
                "data": {"actionType": "join_group"}
            }
        ],
        "edges": [] # No edges, should finish after one node
    }
    
    chatwoot = MagicMock()
    apply_vars = lambda x: x
    
    # We mock log_node_execution to avoid DB interactions
    with patch("services.engine.log_node_execution", new_callable=AsyncMock) as mock_log:
        await execute_graph_funnel(
            trigger=trigger,
            graph_data=graph_data,
            chatwoot=chatwoot,
            conversation_id=1,
            contact_phone="5511999999999",
            db=db,
            apply_vars=apply_vars
        )
        
        # Verify action was logged
        # Calls: started, completed (Action logic), FINISH
        assert mock_log.call_count >= 2
        mock_log.assert_any_call(db, trigger, "node_action", "completed", "Ação 'Entrar no Grupo' executada.")

@pytest.mark.asyncio
async def test_template_node_external_event_fix():
    # Setup mocks
    db = MagicMock()
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.id = 2
    trigger.current_node_id = "node_template"
    trigger.status = "processing"
    trigger.client_id = 1
    trigger.template_components = []
    trigger.execution_history = []
    
    graph_data = {
        "nodes": [
            {
                "id": "node_template",
                "type": "templateNode",
                "data": {
                    "templateName": "test_template",
                    "check24hWindow": False
                }
            }
        ],
        "edges": []
    }
    
    chatwoot = MagicMock()
    # Mock send_template to return success
    chatwoot.send_template = AsyncMock(return_value={"messages": [{"id": "wamid.123"}]})
    apply_vars = lambda x: x
    
    with patch("services.engine.log_node_execution", new_callable=AsyncMock), \
         patch("services.engine.publish_node_external_event", new_callable=AsyncMock) as mock_publish, \
         patch("services.engine.wait_for_delivery_sync", new_callable=AsyncMock) as mock_wait:
        
        mock_wait.return_value = ("delivered", "OK")
        
        await execute_graph_funnel(
            trigger=trigger,
            graph_data=graph_data,
            chatwoot=chatwoot,
            conversation_id=1,
            contact_phone="5511999999999",
            db=db,
            apply_vars=apply_vars
        )
        
        # Verify publish_node_external_event was called with correct arguments
        # It should have 7 arguments (db, trigger, data, content, phone, node_id, event_type)
        mock_publish.assert_called_once()
        args, kwargs = mock_publish.call_args
        assert args[0] == db
        assert args[1] == trigger
        assert kwargs['node_id'] == "node_template"

import sys
import os
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to path (inserted at the beginning to avoid conflict with installed packages)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mocking database modules
mock_db_module = MagicMock()
sys.modules["database"] = mock_db_module
mock_db_session = MagicMock()
mock_db_module.SessionLocal = MagicMock(return_value=mock_db_session)
mock_db_module.Base = MagicMock()

import models
from worker import handle_agent_memory_webhook

@pytest.mark.anyio
async def test_worker_updates_memory_status_in_history():
    # Setup trigger with sample execution history
    trigger_id = 1
    node_id = "node_msg_1"
    
    sample_history = [
        {
            "node_id": node_id,
            "status": "processing",
            "timestamp": "2024-01-01T00:00:00Z",
            "extra": {"memory_status": "queued"}
        }
    ]
    
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = trigger_id
    mock_trigger.execution_history = sample_history
    
    # Mock DB Query
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_trigger
    mock_db_session.query.return_value.filter.return_value.update.return_value = 1
    
    # Mock data for the worker
    data = {
        "client_id": 1,
        "contact_phone": "5511999999999",
        "trigger_id": trigger_id,
        "node_id": node_id
    }
    
    # Mock httpx and settings
    with patch("worker.get_setting", return_value="http://mock-webhook.local"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        
        mock_post.return_value.status_code = 200
        
        # Call the worker handler
        await handle_agent_memory_webhook(data)
        
        # Verify it called db.execute with the atomic SQL (for execution_history update)
        # and not the old log_node_execution
        assert mock_db_session.execute.called
        # Verify it updated MessageStatus as well
        assert mock_db_session.query.return_value.filter.return_value.update.called

if __name__ == "__main__":
    asyncio.run(test_worker_updates_memory_status_in_history())

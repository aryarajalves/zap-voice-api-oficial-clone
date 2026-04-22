import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock environment
os.environ["DATABASE_URL"] = "sqlite://"

from services.ai_memory import notify_ai_memory

@pytest.mark.asyncio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_notify_ai_memory_enabled(mock_get_setting, mock_rabbitmq):
    # Setup
    mock_get_setting.return_value = "true"
    mock_rabbitmq.publish = AsyncMock()
    
    # Execute
    await notify_ai_memory(
        client_id=1,
        phone="5511999999999",
        content="Hello world",
        msg_type="text",
        direction="incoming"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_called_once()
    args, kwargs = mock_rabbitmq.publish.call_args
    queue_name = args[0]
    payload = args[1]
    
    assert queue_name == "ai_memory_queue"
    assert payload["phone"] == "5511999999999"
    assert payload["content"] == "Hello world"
    assert payload["direction"] == "incoming"
    assert payload["type"] == "text"
    assert "timestamp" in payload

@pytest.mark.asyncio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_notify_ai_memory_disabled(mock_get_setting, mock_rabbitmq):
    # Setup
    mock_get_setting.return_value = "false"
    mock_rabbitmq.publish = AsyncMock()
    
    # Execute
    await notify_ai_memory(
        client_id=1,
        phone="5511999999999",
        content="Hello world",
        msg_type="text",
        direction="incoming"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_not_called()

@pytest.mark.asyncio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_notify_ai_memory_missing_setting(mock_get_setting, mock_rabbitmq):
    # Setup
    mock_get_setting.return_value = None
    mock_rabbitmq.publish = AsyncMock()
    
    # Execute
    await notify_ai_memory(
        client_id=1,
        phone="5511999999999",
        content="Hello world",
        msg_type="text"
    )
    
    # Verify (Default should be disabled)
    mock_rabbitmq.publish.assert_not_called()

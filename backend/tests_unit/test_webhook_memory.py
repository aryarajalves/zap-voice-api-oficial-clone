import pytest
import os
import sys
import json
from unittest.mock import AsyncMock, patch, MagicMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock environment
os.environ["DATABASE_URL"] = "sqlite://"

from services.ai_memory import notify_agent_memory_webhook

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_notify_agent_memory_webhook_success(mock_get_setting, mock_rabbitmq):
    # Setup
    test_url = "https://webhook.site/test"
    def side_effect(key, default="", client_id=None):
        if key == "AGENT_MEMORY_WEBHOOK_URL":
            return test_url
        if key == "CHATWOOT_ACCOUNT_ID":
            return "1"
        return default
    mock_get_setting.side_effect = side_effect
    mock_rabbitmq.publish = AsyncMock()
    
    # Execute
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999999999",
        name="John Doe",
        template_name="welcome_msg",
        content="Welcome to ZapVoice!"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_called_once()
    args, kwargs = mock_rabbitmq.publish.call_args
    queue_name = args[0]
    payload = args[1]
    
    assert queue_name == "agent_memory_webhook_queue"
    assert payload["contact_name"] == "John Doe"
    assert payload["contact_phone"] == "5511999999999"
    assert payload["name"] == "John Doe"
    assert payload["phone"] == "5511999999999"
    assert payload["template_name"] == "welcome_msg"
    assert payload["template_content"] == "Welcome to ZapVoice!"
    assert payload["conta_id"] == 1
    assert payload["account_id"] == 1
    assert payload["chatwoot_account_id"] == 1
    assert payload["account"]["id"] == 1
    assert payload["conta"]["id"] == 1
    assert "timestamp" in payload

@pytest.mark.anyio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_notify_agent_memory_webhook_no_url(mock_get_setting, mock_rabbitmq):
    # Setup
    mock_get_setting.return_value = ""
    mock_rabbitmq.publish = AsyncMock()
    
    # Execute
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999999999",
        name="John Doe",
        content="Test content"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_not_called()

@pytest.mark.anyio
@patch("services.ai_memory.rabbitmq")
@patch("services.ai_memory.get_setting")
async def test_notify_agent_memory_webhook_error_handling(mock_get_setting, mock_rabbitmq):
    # Setup
    mock_get_setting.return_value = "https://error-url.com"
    mock_rabbitmq.publish = AsyncMock(side_effect=Exception("RabbitMQ Failed"))
    
    # Execute (Should not raise exception)
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999999999",
        content="Test content"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_called_once()


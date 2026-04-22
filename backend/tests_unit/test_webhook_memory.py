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
@patch("services.ai_memory.httpx.AsyncClient")
@patch("services.ai_memory.get_setting")
async def test_notify_agent_memory_webhook_success(mock_get_setting, mock_client_class):
    # Setup
    test_url = "https://webhook.site/test"
    mock_get_setting.return_value = test_url
    
    mock_client = MagicMock()
    mock_client.post = AsyncMock()
    mock_client.post.return_value.status_code = 200
    mock_client.__aenter__.return_value = mock_client
    mock_client_class.return_value = mock_client
    
    # Execute
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999999999",
        name="John Doe",
        template_name="welcome_msg",
        content="Welcome to ZapVoice!"
    )
    
    # Verify
    mock_client.post.assert_called_once()
    args, kwargs = mock_client.post.call_args
    url = args[0]
    payload = kwargs["json"]
    
    assert url == test_url
    assert payload["contact_name"] == "John Doe"
    assert payload["contact_phone"] == "5511999999999"
    assert payload["template_name"] == "welcome_msg"
    assert payload["template_content"] == "Welcome to ZapVoice!"
    assert "timestamp" in payload

@pytest.mark.anyio
@patch("services.ai_memory.httpx.AsyncClient")
@patch("services.ai_memory.get_setting")
async def test_notify_agent_memory_webhook_no_url(mock_get_setting, mock_client_class):
    # Setup
    mock_get_setting.return_value = ""
    mock_client = MagicMock()
    mock_client.post = AsyncMock() # Need to define post even if not called
    mock_client_class.return_value = mock_client
    
    # Execute
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999999999",
        name="John Doe",
        content="Test content"
    )
    
    # Verify
    mock_client.post.assert_not_called()

@pytest.mark.anyio
@patch("services.ai_memory.httpx.AsyncClient")
@patch("services.ai_memory.get_setting")
async def test_notify_agent_memory_webhook_error_handling(mock_get_setting, mock_client_class):
    # Setup
    mock_get_setting.return_value = "https://error-url.com"
    
    mock_client = MagicMock()
    mock_client.post = AsyncMock(side_effect=Exception("Connection Failed"))
    mock_client.__aenter__.return_value = mock_client
    mock_client_class.return_value = mock_client
    
    # Execute (Should not raise exception)
    await notify_agent_memory_webhook(
        client_id=1,
        phone="5511999999999",
        content="Test content"
    )
    
    # Verify
    mock_client.post.assert_called_once()

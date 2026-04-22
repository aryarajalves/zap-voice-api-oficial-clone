import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from services.engine import publish_node_external_event

@pytest.mark.asyncio
@patch("services.engine.rabbitmq")
async def test_publish_node_external_event_enabled(mock_rabbitmq):
    # Setup
    mock_rabbitmq.publish = AsyncMock()
    
    mock_trigger = MagicMock()
    mock_trigger.id = 123
    mock_trigger.contact_name = "Test User"
    mock_trigger.funnel_id = 456
    mock_trigger.event_type = "purchase"
    mock_trigger.product_name = "Course A"
    mock_trigger.integration_id = None
    
    mock_node_data = {
        "publishExternalEvent": True,
        "content": "Hello world"
    }
    
    # Execute
    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="Hello world",
        contact_phone="5511999999999",
        node_id="node_1"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_called_once()
    args, kwargs = mock_rabbitmq.publish.call_args
    queue_name = args[0]
    payload = args[1]
    
    assert queue_name == "agent_memory_webhook_queue"
    assert payload["contact_name"] == "Test User"
    assert payload["content"] == "Hello world"
    assert payload["contact_phone"] == "5511999999999"
    assert payload["trigger_id"] == 123
    assert payload["node_id"] == "node_1"

@pytest.mark.asyncio
@patch("services.engine.rabbitmq")
async def test_publish_node_external_event_disabled(mock_rabbitmq):
    # Setup
    mock_rabbitmq.publish = AsyncMock()
    
    mock_trigger = MagicMock()
    mock_node_data = {
        "publishExternalEvent": False
    }
    
    # Execute
    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="Hello world",
        contact_phone="5511999999999",
        node_id="disabled_node"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_not_called()

@pytest.mark.asyncio
@patch("services.engine.rabbitmq")
async def test_publish_node_external_event_audio(mock_rabbitmq):
    # Setup
    mock_rabbitmq.publish = AsyncMock()
    
    mock_trigger = MagicMock()
    mock_trigger.id = 789
    mock_trigger.funnel_id = 101
    
    mock_node_data = {
        "publishExternalEvent": True,
        "mediaUrl": "https://example.com/audio.mp3"
    }
    
    # Execute
    await publish_node_external_event(
        db=MagicMock(),
        trigger=mock_trigger,
        data=mock_node_data,
        content="https://example.com/audio.mp3",
        contact_phone="5511988888888",
        node_id="audio_node",
        event_type="funnel_audio_sent"
    )
    
    # Verify
    mock_rabbitmq.publish.assert_called_once()
    args, kwargs = mock_rabbitmq.publish.call_args
    queue_name = args[0]
    payload = args[1]
    
    assert queue_name == "agent_memory_webhook_queue"
    assert payload["content"] == "https://example.com/audio.mp3"
    assert payload["contact_phone"] == "5511988888888"

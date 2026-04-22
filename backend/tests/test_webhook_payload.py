import sys
import os
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock rabbitmq_client, config_loader and database before imports
sys.modules["rabbitmq_client"] = MagicMock()
sys.modules["database"] = MagicMock()
sys.modules["config_loader"] = MagicMock()

import rabbitmq_client
mock_rabbitmq = MagicMock()
mock_rabbitmq.publish = AsyncMock()
rabbitmq_client.rabbitmq = mock_rabbitmq

import config_loader
config_loader.get_setting = MagicMock(return_value="http://webhook.url")

from services.ai_memory import notify_agent_memory_webhook


@pytest.mark.anyio
async def test_notify_agent_memory_webhook_payload_structure():
    client_id = 1
    phone = "5511999999999"
    name = "João Silva"
    template_name = "test_template"
    content = "Hello World"
    trigger_id = 123
    node_id = "test_node"

    with patch("services.ai_memory.get_setting", return_value="http://webhook.url"):
        
        await notify_agent_memory_webhook(
            client_id=client_id,
            phone=phone,
            name=name,
            template_name=template_name,
            content=content,
            trigger_id=trigger_id,
            node_id=node_id
        )
        
        assert mock_rabbitmq.publish.called
        args, kwargs = mock_rabbitmq.publish.call_args
        queue_name = args[0]
        payload = args[1]
        
        assert queue_name == "agent_memory_webhook_queue"
        assert payload["contact_phone"] == "5511999999999"
        assert payload["contact_name"] == name
        assert payload["template_name"] == template_name
        assert payload["template_content"] == content
        assert payload["Dono"] == "agente"
        assert "timestamp" in payload
        assert payload["client_id"] == client_id
        assert payload["trigger_id"] == trigger_id
        assert payload["node_id"] == node_id
        
        print("SUCCESS: Teste de estrutura do payload do webhook de memoria passou!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_notify_agent_memory_webhook_payload_structure())

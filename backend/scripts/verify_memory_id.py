
import asyncio
import sys
from unittest.mock import MagicMock, AsyncMock, patch

# Mock rabbitmq_client before it gets imported by services.ai_memory
mock_rabbitmq_client = MagicMock()
mock_rabbitmq_client.rabbitmq = MagicMock()
mock_rabbitmq_client.rabbitmq.publish = AsyncMock()
sys.modules["rabbitmq_client"] = mock_rabbitmq_client

# Now add backend to path and import
sys.path.append("backend")
from services.ai_memory import notify_agent_memory_webhook

async def run_test():
    print("Testing notify_agent_memory_webhook with internal_contact_id...")
    
    with patch("services.ai_memory.get_setting", return_value="https://webhook.site/test"):
        await notify_agent_memory_webhook(
            client_id=1,
            phone="5511999999999",
            content="Teste de memória",
            internal_contact_id=123
        )
        
        # Verify publish call
        mock_rabbitmq_client.rabbitmq.publish.assert_called_once()
        args = mock_rabbitmq_client.rabbitmq.publish.call_args[0]
        payload = args[1]
        
        assert payload["contact_id"] == 123
        print("✅ Test passed: contact_id included in payload")

if __name__ == "__main__":
    asyncio.run(run_test())

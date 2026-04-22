
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.ai_memory import notify_agent_memory_webhook

@pytest.mark.asyncio
async def test_notify_agent_memory_webhook_includes_contact_id():
    # Mock settings and rabbitmq
    with patch("services.ai_memory.get_setting", return_value="https://webhook.site/test"), \
         patch("services.ai_memory.rabbitmq.publish", new_callable=AsyncMock) as mock_publish:
        
        client_id = 1
        phone = "5511999999999"
        internal_id = 123
        
        await notify_agent_memory_webhook(
            client_id=client_id,
            phone=phone,
            content="Teste de memória",
            internal_contact_id=internal_id
        )
        
        # Verify that rabbitmq.publish was called with the correct payload
        mock_publish.assert_called_once()
        args, kwargs = mock_publish.call_args
        queue_name = args[0]
        payload = args[1]
        
        assert queue_name == "agent_memory_webhook_queue"
        assert payload["contact_phone"] == "5511999999999"
        assert payload["contact_id"] == 123
        assert "timestamp" in payload

@pytest.mark.asyncio
async def test_notify_agent_memory_webhook_no_id_is_fine():
    # Mock settings and rabbitmq
    with patch("services.ai_memory.get_setting", return_value="https://webhook.site/test"), \
         patch("services.ai_memory.rabbitmq.publish", new_callable=AsyncMock) as mock_publish:
        
        await notify_agent_memory_webhook(
            client_id=1,
            phone="5511999999999",
            content="Teste sem ID"
        )
        
        mock_publish.assert_called_once()
        payload = mock_publish.call_args[0][1]
        assert payload["contact_id"] is None

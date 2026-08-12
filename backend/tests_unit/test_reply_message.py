import pytest
from unittest.mock import AsyncMock, patch
from core.clients.whatsapp.client import WhatsAppClient

@pytest.mark.asyncio
async def test_send_text_official_with_quoted_message():
    wa_client = WhatsAppClient(client_id=1)
    
    with patch.object(wa_client, "_meta_request", new_callable=AsyncMock) as mock_meta:
        mock_meta.return_value = {"messages": [{"id": "wamid.outbound123"}]}
        
        # Teste com citação (quote reply)
        res = await wa_client.send_text_official(
            phone_number="5511999999999",
            text="Esta é uma resposta",
            quoted_message_id="wamid.inbound456"
        )
        
        assert res == {"messages": [{"id": "wamid.outbound123"}]}
        mock_meta.assert_called_once_with(
            "POST",
            "messages",
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": "5511999999999",
                "type": "text",
                "text": {"body": "Esta é uma resposta"},
                "context": {"message_id": "wamid.inbound456"}
            }
        )

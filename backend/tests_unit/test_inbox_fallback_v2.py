import asyncio
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch

# Adiciona o diretório atual ao path para importar corretamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# Adiciona o diretório backend se estiver rodando dentro de tests_unit
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chatwoot_client import ChatwootClient

async def test_fallback_logic_direct():
    print("--- 🔍 Testing ChatwootClient.get_inboxes Fallback ---")
    client = ChatwootClient(client_id=1)
    client.api_token = "valid_token"
    client.settings = {"CHATWOOT_SELECTED_INBOX_ID": "1"} # Requested ID 1
    
    # Available Inboxes (ID 1 is missing)
    all_inboxes = [
        {"id": 5, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        {"id": 10, "name": "Email", "channel_type": "Channel::Email"}
    ]
    
    # We override the actual network logic by mocking the 'httpx.AsyncClient.get'
    # but since it's inside an 'async with', it's easier to mock the whole method or the response.
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"payload": all_inboxes}
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        
        inboxes = await client.get_inboxes()
        
        # VERIFICATION:
        # 1. ID 1 was requested but missing.
        # 2. It should have fallen back to ALL WhatsApp inboxes.
        # 3. 'filtered' should contain ID 5.
        
        print(f"Requested: [1] | Available: {[ib['id'] for ib in all_inboxes]}")
        print(f"Result Inboxes: {[ib['id'] for ib in inboxes]}")
        
        assert len(inboxes) == 1
        assert inboxes[0]["id"] == 5
        assert inboxes[0]["name"] == "WhatsApp"
        print("✅ SUCCESS: Fallback logic verified: ID 1 missing -> Used ID 5 (WhatsApp)")

if __name__ == "__main__":
    asyncio.run(test_fallback_logic_direct())

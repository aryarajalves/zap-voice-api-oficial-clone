import pytest
from unittest.mock import MagicMock, AsyncMock
from chatwoot_client import ChatwootClient

@pytest.mark.asyncio
async def test_get_inboxes_fallback():
    # Setup
    client = ChatwootClient(client_id=1)
    
    # Mock settings to have CHATWOOT_SELECTED_INBOX_ID = "1"
    client.settings = {"CHATWOOT_SELECTED_INBOX_ID": "1"}
    
    # Mock Response from Chatwoot: ID 1 is MISSING, but ID 5 (WhatsApp) exists.
    mock_inboxes = [
        {"id": 5, "name": "WhatsApp Inbox", "channel_type": "Channel::Whatsapp"},
        {"id": 10, "name": "Email Inbox", "channel_type": "Channel::Email"}
    ]
    
    # Mock _request or the httpx call
    # get_inboxes uses httpx.AsyncClient().get() directly
    # So we'll patch the get_inboxes return of inboxes
    
    async def mock_get_inboxes_payload():
        return mock_inboxes
    
    # Instead of mocking the whole class, let's mock the network call inside get_inboxes
    # We can use a context manager mock for httpx
    
    with MagicMock() as mock_httpx:
        # Mocking the flow: httpx.AsyncClient() -> __aenter__ -> client -> get() -> response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"payload": mock_inboxes}
        mock_response.raise_for_status = MagicMock()
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        # This is complex to mock deep inside AsyncClient context manager.
        # Let's just override the get_inboxes return of the raw inboxes.
        pass

    # SIMPLER APPROACH: Modify the code to be more testable or just mock the network call
    # Let's mock the return of the HTTP request.
    
@pytest.mark.asyncio
async def test_fallback_logic_direct():
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
    
    # Let's mock the 'get_inboxes' internal filter logic by calling it with a mocked response
    
    # I'll update the ChatwootClient to allow passing inboxes for testing or just mock the network
    import httpx
    from unittest.mock import patch
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"payload": all_inboxes}
        mock_get.return_value = mock_resp
        
        inboxes = await client.get_inboxes()
        
        # VERIFICATION:
        # 1. ID 1 was requested but missing.
        # 2. It should have fallen back to ALL WhatsApp inboxes.
        # 3. 'filtered' should contain ID 5.
        
        assert len(inboxes) == 1
        assert inboxes[0]["id"] == 5
        assert inboxes[0]["name"] == "WhatsApp"
        print("✅ Fallback logic verified: ID 1 missing -> Used ID 5 (WhatsApp)")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_fallback_logic_direct())

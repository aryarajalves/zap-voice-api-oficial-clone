import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from chatwoot_client import ChatwootClient
import json

@pytest.mark.asyncio
async def test_ensure_conversation_prioritizes_24h_window():
    """
    Test that ensure_conversation prioritizes a 'resolved' conversation with an open 24h window
    over an 'open' conversation without one.
    """
    client = ChatwootClient(client_id=1)
    client.api_token = "fake_token"
    
    phone_number = "5585999999999"
    inbox_id = 123
    contact_id = 456
    
    # 1. Mock search_contact to find our contact
    client.search_contact = AsyncMock(return_value={"payload": [{"id": contact_id}]})
    
    # 2. Mock get_contact_conversations to return two conversations
    # Conv 1: Status 'open', but 24h window will be closed
    # Conv 2: Status 'resolved', but 24h window will be open
    conversations = [
        {"id": 1001, "status": "open", "inbox_id": inbox_id},
        {"id": 1002, "status": "resolved", "inbox_id": inbox_id}
    ]
    client.get_contact_conversations = AsyncMock(return_value=conversations)
    
    # 3. Mock is_within_24h_window
    # We want it to be False for the 'open' one (1001) and True for the 'resolved' one (1002)
    async def side_effect_24h(conv_id):
        if conv_id == 1001:
            return False
        if conv_id == 1002:
            return True
        return False
        
    client.is_within_24h_window = AsyncMock(side_effect=side_effect_24h)
    
    # 4. Execute ensure_conversation
    conv_res = await client.ensure_conversation(phone_number, "Test User", inbox_id)
    selected_id = conv_res.get("conversation_id") if conv_res else None
    
    # 5. Assertions
    # It should have checked both and picked 1002
    assert selected_id == 1002
    assert client.is_within_24h_window.call_count >= 2
    
@pytest.mark.asyncio
async def test_ensure_conversation_fallback_to_open_status():
    """
    Test that ensure_conversation falls back to status 'open' if no 24h window is found.
    """
    client = ChatwootClient(client_id=1)
    client.api_token = "fake_token"
    
    phone_number = "5585999999999"
    inbox_id = 123
    contact_id = 456
    
    client.search_contact = AsyncMock(return_value={"payload": [{"id": contact_id}]})
    
    conversations = [
        {"id": 1001, "status": "pending", "inbox_id": inbox_id},
        {"id": 1002, "status": "open", "inbox_id": inbox_id}
    ]
    client.get_contact_conversations = AsyncMock(return_value=conversations)
    
    # No 24h window for any
    client.is_within_24h_window = AsyncMock(return_value=False)
    
    conv_res = await client.ensure_conversation(phone_number, "Test User", inbox_id)
    selected_id = conv_res.get("conversation_id") if conv_res else None
    
    # Should pick 1002 because status is 'open'
    assert selected_id == 1002

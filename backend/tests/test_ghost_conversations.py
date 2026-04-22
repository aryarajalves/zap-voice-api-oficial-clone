import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mocking database BEFORE worker imports
sys.modules["database"] = MagicMock()
mock_db_session = MagicMock()
sys.modules["database"].SessionLocal = MagicMock(return_value=mock_db_session)
sys.modules["database"].Base = MagicMock()

import models
from worker import handle_funnel_execution, handle_whatsapp_event

@pytest.mark.anyio
async def test_funnel_execution_without_conversation_creation():
    """
    Test that handle_funnel_execution does NOT call ensure_conversation 
    if no conversation_id is provided.
    """
    # Setup Mock Trigger
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.id = 123
    trigger.client_id = 1
    trigger.conversation_id = None
    trigger.status = 'pending'
    trigger.contact_phone = "558599999999"
    trigger.integration_id = None
    trigger.funnel_id = 456
    
    # Mock Funnel relationship
    mock_funnel = MagicMock(spec=models.Funnel)
    mock_funnel.id = 456
    trigger.funnel = mock_funnel
    
    # Configure DB Mock to return our trigger
    mock_db_session.query.return_value.get.return_value = trigger
    mock_db_session.query.return_value.filter.return_value.first.return_value = trigger

    # Mock ChatwootClient
    with patch('chatwoot_client.ChatwootClient') as MockClient:
        client_instance = MockClient.return_value
        client_instance.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        client_instance.ensure_conversation = AsyncMock(return_value=44)
        client_instance.send_template = AsyncMock(return_value={"messages": [{"id": "wamid.123"}]})
        
        # Mock Engine execute_funnel
        with patch('worker.execute_funnel', new_callable=AsyncMock) as mock_engine:
            
            data = {"trigger_id": 123, "client_id": 1, "contact_phone": "558599999999"}
            await handle_funnel_execution(data)
            
            # VERIFICATION: ensure_conversation should NOT have been called in worker
            assert client_instance.ensure_conversation.call_count == 0
            
            # VERIFICATION: engine should have been called
            mock_engine.assert_called_once()

@pytest.mark.anyio
async def test_conversation_created_on_delivery():
    """
    Test that handle_whatsapp_event creates the conversation 
    when a 'delivered' status is received.
    """
    # Setup Mock Trigger with NO conversation_id
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.id = 123
    trigger.client_id = 1
    trigger.conversation_id = None # Crucial!
    trigger.contact_phone = "558599999999"
    trigger.contact_name = "John Doe"
    trigger.integration_id = None
    trigger.label_added = False
    
    # Mock MessageStatus
    message_record = MagicMock(spec=models.MessageStatus)
    message_record.trigger = trigger
    message_record.content = "Hello"
    message_record.id = 789
    
    # Configure DB Mock
    mock_db_session.query.return_value.filter.return_value.first.return_value = message_record
    
    # Mock ChatwootClient
    with patch('chatwoot_client.ChatwootClient') as MockClient:
        client_instance = MockClient.return_value
        client_instance.get_default_whatsapp_inbox = AsyncMock(return_value=10)
        client_instance.ensure_conversation = AsyncMock(return_value=99)
        client_instance.send_message = AsyncMock()
        client_instance.add_label_to_conversation = AsyncMock()

        event_data = {
            "statuses": [{
                "id": "wamid.123",
                "status": "delivered",
                "recipient_id": "558599999999"
            }]
        }
        
        await handle_whatsapp_event(event_data)
        
        # VERIFICATION: ensure_conversation WAS called
        client_instance.ensure_conversation.assert_called_once_with(
            phone_number="558599999999",
            name="John Doe",
            inbox_id=10
        )
        
        # VERIFICATION: outgoing message synced to Chatwoot
        client_instance.send_message.assert_called_with(99, "Hello", message_type="outgoing")
        
        # VERIFICATION: trigger updated
        assert trigger.conversation_id == 99

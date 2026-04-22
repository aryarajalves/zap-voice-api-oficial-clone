import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from chatwoot_client import ChatwootClient
from worker import handle_funnel_execution
from database import SessionLocal
import models
from datetime import datetime, timezone, timedelta

@pytest.mark.asyncio
async def test_interactive_message_fallback_to_text():
    """
    Test that the worker falls back to send_text_direct when a template has no buttons 
    but the 24h window is open.
    """
    client_id = 1
    trigger_id = 999
    contact_phone = "5528999140716"
    
    # Mock Database
    mock_db = MagicMock()
    
    # Mock Trigger
    mock_trigger = MagicMock(spec=models.ScheduledTrigger)
    mock_trigger.id = trigger_id
    mock_trigger.client_id = client_id
    mock_trigger.contact_phone = contact_phone
    mock_trigger.template_name = "carrinho_abandonado"
    mock_trigger.is_free_message = True
    mock_trigger.status = 'processing'
    mock_trigger.integration_id = None
    mock_trigger.event_type = None
    mock_trigger.template_components = []
    
    # Mock Template Cache (NO BUTTONS)
    mock_template = MagicMock(spec=models.WhatsAppTemplateCache)
    mock_template.name = "carrinho_abandonado"
    mock_template.body = "Olá, você esqueceu algo no carrinho!"
    mock_template.components = [{"type": "BODY", "text": "Olá, você esqueceu algo no carrinho!"}] # No BUTTONS type
    
    # Setup DB queries
    def db_query_side_effect(model):
        q = MagicMock()
        if model == models.ScheduledTrigger:
            q.get.return_value = mock_trigger
            q.filter.return_value = q
            q.first.return_value = mock_trigger
        elif model == models.WhatsAppTemplateCache:
            q.filter.return_value = q
            q.first.return_value = mock_template
        return q
        
    mock_db.query.side_effect = db_query_side_effect
    
    # Mock ChatwootClient
    with patch('worker.ChatwootClient') as MockClient, \
         patch('worker.SessionLocal', return_value=mock_db):
        
        instance = MockClient.return_value
        # Mock 24h window open
        instance.get_contact_conversations = AsyncMock(return_value=[{
            'id': 100, 
            'last_incoming_at': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        }])
        instance.send_interactive_message = AsyncMock()
        instance.send_text_direct = AsyncMock(return_value={"messages": [{"id": "wamid.test"}]})
        
        # Execute
        from worker import handle_funnel_execution
        await handle_funnel_execution({"trigger_id": trigger_id, "client_id": client_id})
        
        # Verify
        # 1. send_interactive_message should NOT be called because there are no buttons
        instance.send_interactive_message.assert_not_called()
        
        # 2. send_text_direct SHOULD be called as fallback
        instance.send_text_direct.assert_called_once_with(
            phone_number=contact_phone,
            content="Olá, você esqueceu algo no carrinho!"
        )
        
        print("\n✅ Test Passed: Fallback to send_text_direct worked correctly when buttons are missing.")

if __name__ == "__main__":
    asyncio.run(test_interactive_message_fallback_to_text())

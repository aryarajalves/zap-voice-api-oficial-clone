import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
from datetime import datetime, timezone

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import models
from tests_unit.test_window_enforcement import MockSession

@pytest.fixture
def mock_db():
    return MockSession()

@pytest.mark.asyncio
async def test_worker_parses_conversation_dict_with_conversation_id(mock_db):
    """
    Verify handle_whatsapp_event successfully extracts resolved_convo_id from a dictionary 
    returned by ensure_conversation containing "conversation_id".
    """
    from worker import handle_whatsapp_event
    
    data = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "123",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "948132921713045"},
                    "contacts": [{"profile": {"name": "Test"}, "wa_id": "553791165753"}],
                    "messages": [{"from": "553791165753", "id": "w1", "type": "text", "text": {"body": "hi"}}]
                },
                "field": "messages"
            }]
        }]
    }

    # Reset mock window state
    mock_db.mock_window.chatwoot_conversation_id = None
    mock_db.committed = False

    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=mock_db):
        with patch("core.worker.handlers.whatsapp.ChatwootClient") as MockCW:
            cw_inst = MockCW.return_value
            cw_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
            # Simulating the actual API return dictionary containing "conversation_id"
            cw_inst.ensure_conversation = AsyncMock(return_value={"conversation_id": 9999})
            
            with patch("asyncio.create_task"):
                await handle_whatsapp_event(data)
                
                # Verify that the window mock record was updated with the ID 9999
                assert mock_db.mock_window.chatwoot_conversation_id == 9999
                assert mock_db.committed is True

@pytest.mark.asyncio
async def test_executor_parses_conversation_dict_with_conversation_id(mock_db):
    """
    Verify that the executor successfully extracts the conversation ID from a dict 
    containing "conversation_id" and sets the trigger's conversation_id accordingly.
    """
    from core.engine.executor import execute_funnel
    
    # 1. Setup Trigger and Funnel
    trigger = mock_db.mock_trigger
    trigger.conversation_id = None
    trigger.chatwoot_label = "test_label"
    trigger.private_message = "Test private note"
    trigger.private_message_delay = 0
    trigger.client_id = 1
    
    funnel = mock_db.mock_funnel
    
    # Setup mock ChatwootClient that gets instantiated inside execute_funnel
    with patch("core.engine.executor.ChatwootClient") as MockCW:
        mock_cw = MockCW.return_value
        # Simulating actual API return dict with "conversation_id"
        mock_cw.ensure_conversation = AsyncMock(return_value={"conversation_id": 8888})
        mock_cw.add_label_to_conversation = AsyncMock()
        mock_cw.create_private_note = AsyncMock()

        # We mock execute_legacy_funnel and execute_graph_funnel to avoid side effects
        with patch("core.engine.executor.execute_legacy_funnel", new_callable=AsyncMock) as mock_legacy, \
             patch("core.engine.executor.execute_graph_funnel", new_callable=AsyncMock) as mock_graph:
             
             await execute_funnel(
                 funnel_id=funnel.id,
                 conversation_id=None,
                 trigger_id=trigger.id,
                 contact_phone="553791165753",
                 db=mock_db,
                 skip_block_check=True
             )
             
             # 3. Verify target_convo_id was extracted correctly and saved
             assert trigger.conversation_id == 8888
             # Verify labels and notes were applied with the correct conversation ID
             mock_cw.add_label_to_conversation.assert_called_once_with(8888, ["test_label"])
             mock_cw.create_private_note.assert_called_once_with(8888, "Test private note")

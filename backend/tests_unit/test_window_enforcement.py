import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
from datetime import datetime, timezone, timedelta

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Delay imports until env is set if needed or mock them
# from worker import handle_whatsapp_event
from services.engine import execute_funnel
from services.window_manager import is_window_open_strict
import models

class MockSession:
    def __init__(self):
        self.added = []
        self.committed = False
        self.rolled_back = False
        
        # Pre-create Mock Objects
        self.mock_trigger = MagicMock()
        self.mock_trigger.id = 1
        self.mock_trigger.status = 'queued'
        self.mock_trigger.client_id = 1
        self.mock_trigger.is_bulk = False
        self.mock_trigger.current_node_id = None
        self.mock_trigger.updated_at = datetime.now(timezone.utc)
        self.mock_trigger.failure_reason = None
        
        self.mock_funnel = MagicMock()
        self.mock_funnel.id = 10
        self.mock_funnel.steps = {"nodes": [{"id": "1", "type": "message", "data": {"content": "Hello"}}], "edges": []}
        
        # This mock window will initially have NO conversation ID (simulating the bug)
        self.mock_window = MagicMock()
        self.mock_window.last_interaction_at = datetime.now(timezone.utc)
        self.mock_window.chatwoot_conversation_id = None # CRITICAL FOR TEST
        self.mock_window.client_id = 1
        self.mock_window.phone = "553791165753"
        
        self.mock_config = MagicMock()
        self.mock_config.client_id = 1
        self.mock_config.value = "test_value"

    def query(self, model):
        q = MagicMock()
        q.filter.return_value = q
        q.order_by.return_value = q
        q.with_for_update.return_value = q
        
        if model == models.ScheduledTrigger:
            q.first.return_value = self.mock_trigger
        elif model == models.Funnel:
            q.first.return_value = self.mock_funnel
        elif model == models.ContactWindow:
            # We use first() for the simple queries
            # For order_by().first(), it also returns it
            q.first.return_value = self.mock_window
        elif model == models.AppConfig:
            q.first.side_effect = [None, self.mock_config, self.mock_config, self.mock_config, self.mock_config, self.mock_config, self.mock_config, self.mock_config]
        else:
            q.first.return_value = None
        return q
    
    def add(self, obj): self.added.append(obj)
    def commit(self): self.committed = True
    def flush(self): pass
    def close(self): pass
    def rollback(self): self.rolled_back = True
    def execute(self, *args, **kwargs): pass

@pytest.fixture
def mock_db():
    return MockSession()

@pytest.mark.asyncio
async def test_is_window_open_strict_with_phone_fallback(mock_db):
    """
    Test that is_window_open_strict returns True if it finds a fresh interaction 
    for the phone, even if the chatwoot_conversation_id doesn't match/is NULL.
    """
    client_id = 1
    phone = "553791165753"
    current_convo_id = 19
    
    # Mock Chatwoot API to say CLOSED (simulating reporting delay)
    mock_cw = AsyncMock()
    mock_cw.is_within_24h_window.return_value = False
    
    # Even if API says CLOSED, if Cache has fresh timestamp for the PHONE, it should be True
    res = await is_window_open_strict(client_id, phone, current_convo_id, mock_db, mock_cw)
    
    assert res is True
    # Verify that it first checked the conversation match, probably failed (id=None != 19), 
    # but then checked by phone and succeeded.
    
@pytest.mark.asyncio
async def test_worker_syncs_window_id_after_resolution(mock_db):
    """
    Verify handle_whatsapp_event updates the window record with the conversation ID 
    once it's resolved.
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

    with patch("worker.SessionLocal", return_value=mock_db):
        with patch("worker.ChatwootClient") as MockCW:
            cw_inst = MockCW.return_value
            cw_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
            cw_inst.ensure_conversation = AsyncMock(return_value=19)
            
            with patch("asyncio.create_task"):
                await handle_whatsapp_event(data)
                
                # Verify that the window mock record was updated with the ID 19
                assert mock_db.mock_window.chatwoot_conversation_id == 19
                assert mock_db.committed is True

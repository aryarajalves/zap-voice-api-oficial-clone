import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os

# Adjust path to import worker
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from worker import handle_whatsapp_event
import models
from datetime import datetime, timezone

class MockSession:
    def __init__(self):
        self.added = []
    
    def query(self, model):
        # We create a mock that returns itself for chained calls
        q = MagicMock()
        q.with_for_update.return_value = q
        q.filter.return_value = q
        q.order_by.return_value = q
        
        if model == models.AppConfig:
            # First call is usually META_RETURN_CONFIG (return None)
            # Subsequent calls are for WA_PHONE_NUMBER_ID (return config)
            mock_conf = MagicMock()
            mock_conf.client_id = 1
            mock_conf.value = "test_value"
            q.first.side_effect = [None, mock_conf, mock_conf, mock_conf, mock_conf, mock_conf, mock_conf, mock_conf]
        elif model == models.Funnel:
            mock_funnel = MagicMock()
            mock_funnel.id = 10
            mock_funnel.name = "Test Funnel"
            mock_funnel.client_id = 1
            mock_funnel.trigger_phrase = "receber o link"
            q.first.return_value = mock_funnel
        else:
            q.first.return_value = None
            
        return q
    
    def add(self, obj):
        self.added.append(obj)
    
    def commit(self): pass
    def flush(self): pass
    def close(self): pass
    def rollback(self): pass
    def execute(self, *args, **kwargs): pass

@pytest.fixture
def mock_db():
    with patch("worker.SessionLocal") as mock_session_local:
        db = MockSession()
        mock_session_local.return_value = db
        yield db

@pytest.fixture
def mock_rabbitmq():
    with patch("worker.rabbitmq", new_callable=AsyncMock) as mock:
        yield mock

@pytest.mark.asyncio
async def test_handle_whatsapp_event_button_triggers_funnel(mock_db, mock_rabbitmq):
    # Setup data
    data = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "12345",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "948132921713045"},
                    "contacts": [{"profile": {"name": "Test User"}, "wa_id": "558599999999"}],
                    "messages": [{
                        "from": "558599999999",
                        "id": "wamid.test_id",
                        "type": "button",
                        "button": {"text": "Receber o Link"}
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    # Mock ChatwootClient search_contact and other methods
    with patch("worker.ChatwootClient") as MockCW:
        cw_inst = MockCW.return_value
        cw_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        cw_inst.ensure_conversation = AsyncMock(return_value=123)
        cw_inst.search_contact = AsyncMock(return_value={"payload": []}) 
        
        # To avoid delayed_sync_chatwoot_name breaking
        with patch("asyncio.create_task"):
            await handle_whatsapp_event(data)
            
            # ASSERT
            # Check if ScheduledTrigger was added
            triggers = [o for o in mock_db.added if isinstance(o, models.ScheduledTrigger)]
            
            assert len(triggers) == 1, f"Expected 1 trigger, got {len(triggers)}"
            trigger = triggers[0]
            assert trigger.funnel_id == 10
            assert trigger.skip_block_check is False

@pytest.mark.asyncio
async def test_handle_whatsapp_event_block_request(mock_db, mock_rabbitmq):
    # Setup data with block keyword
    data = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "12345",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "948132921713045"},
                    "contacts": [{"profile": {"name": "Test User"}, "wa_id": "558599999999"}],
                    "messages": [{
                        "from": "558599999999",
                        "id": "wamid.block_id",
                        "type": "text",
                        "text": {"body": "bloquear"}
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    with patch("worker.get_setting", return_value="bloquear"):
        with patch("worker.ChatwootClient") as MockCW:
            MockCW.return_value.search_contact = AsyncMock(return_value={"payload": []})
            with patch("asyncio.create_task"):
                await handle_whatsapp_event(data)
                
                # Verify BlockedContact was created
                blocks = [o for o in mock_db.added if isinstance(o, models.BlockedContact)]
                assert len(blocks) == 1, f"Expected 1 block, got {len(blocks)}"
                assert blocks[0].phone == "558599999999"
                
                # Verify NO ScheduledTrigger was created
                triggers = [o for o in mock_db.added if isinstance(o, models.ScheduledTrigger)]
                assert len(triggers) == 0

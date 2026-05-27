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
        # Simula db.bind.dialect.name para evitar pg_advisory_lock
        self.bind = MagicMock()
        self.bind.dialect.name = 'sqlite'
    
    def query(self, model):
        # We create a mock that returns itself for chained calls
        q = MagicMock()
        q.with_for_update.return_value = q
        q.filter.return_value = q
        q.order_by.return_value = q
        
        if model == models.AppConfig:
            mock_conf = MagicMock()
            mock_conf.client_id = 1
            mock_conf.value = "test_value"
            q.first.side_effect = [None, mock_conf, mock_conf, mock_conf, mock_conf, mock_conf, mock_conf, mock_conf]
            q.all.return_value = [mock_conf]
        elif model == models.Funnel:
            mock_funnel = MagicMock()
            mock_funnel.id = 10
            mock_funnel.name = "Test Funnel"
            mock_funnel.client_id = 1
            mock_funnel.trigger_phrase = "receber o link"
            q.first.return_value = mock_funnel
        else:
            q.first.return_value = None
            q.all.return_value = []
            
        return q
    
    def add(self, obj):
        self.added.append(obj)
    
    def commit(self): pass
    def flush(self): pass
    def close(self): pass
    def rollback(self): pass
    def execute(self, *args, **kwargs):
        m = MagicMock()
        m.scalar.return_value = True
        return m
    def expire_all(self): pass
    def refresh(self, obj): pass

@pytest.fixture
def mock_db():
    with patch("core.worker.handlers.whatsapp.SessionLocal") as mock_session_local:
        db = MockSession()
        mock_session_local.return_value = db
        yield db

@pytest.fixture
def mock_rabbitmq():
    with patch("core.worker.handlers.whatsapp.rabbitmq", new_callable=AsyncMock) as mock:
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
    with patch("core.worker.handlers.whatsapp.ChatwootClient") as MockCW:
        cw_inst = MagicMock()
        cw_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        cw_inst.ensure_conversation = AsyncMock(return_value={"conversation_id": 123})
        cw_inst.search_contact = AsyncMock(return_value={"payload": []})
        MockCW.return_value = cw_inst
        
        # To avoid delayed_sync_chatwoot_name breaking
        with patch("asyncio.create_task"):
            await handle_whatsapp_event(data)
            
            # ASSERT
            # Check that no ScheduledTrigger was added since trigger_phrase matching is disabled
            triggers = [o for o in mock_db.added if isinstance(o, models.ScheduledTrigger)]

            assert len(triggers) == 0, f"Expected 0 triggers since trigger_phrase is disabled, got {len(triggers)}"

@pytest.mark.asyncio
async def test_handle_whatsapp_event_block_request(mock_rabbitmq):
    """Testa que mensagem de texto sem trigger phrase não cria ScheduledTrigger."""

    class NoFunnelMockSession(MockSession):
        """MockSession que não retorna nenhum funil — simula ausência de match de trigger phrase."""
        def query(self, model):
            q = super().query(model)
            if model == models.Funnel:
                q.first.return_value = None
                q.all.return_value = []
            return q

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
                        "text": {"body": "mensagem_que_nao_e_trigger"}
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    with patch("core.worker.handlers.whatsapp.SessionLocal") as mock_sl:
        db = NoFunnelMockSession()
        mock_sl.return_value = db

        with patch("core.worker.handlers.whatsapp.ChatwootClient") as MockCW:
            cw_inst = MagicMock()
            cw_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
            cw_inst.ensure_conversation = AsyncMock(return_value={"conversation_id": 999})
            cw_inst.search_contact = AsyncMock(return_value={"payload": []})
            MockCW.return_value = cw_inst
            with patch("asyncio.create_task"):
                await handle_whatsapp_event(data)

                # Mensagem sem trigger phrase não deve criar ScheduledTrigger
                triggers = [o for o in db.added if isinstance(o, models.ScheduledTrigger)]
                assert len(triggers) == 0, f"Não deveria criar trigger, mas criou {len(triggers)}"


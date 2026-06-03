import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os

# Adjust path to import worker
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from worker import handle_whatsapp_event
import models

class MockSessionWithFallback:
    def __init__(self, mock_message_record, mock_trigger):
        self.added = []
        self.mock_message_record = mock_message_record
        self.mock_trigger = mock_trigger
        self.bind = MagicMock()
        self.bind.dialect.name = 'sqlite'
        self.commit_called = False

        # Persistent mock for MessageStatus queries to avoid resetting side_effect
        self.status_query = MagicMock()
        self.status_query.with_for_update.return_value = self.status_query
        self.status_query.filter.return_value = self.status_query
        self.status_query.filter_by.return_value = self.status_query
        self.status_query.order_by.return_value = self.status_query
        self.status_query.first.side_effect = [None, self.mock_message_record]

    def query(self, model):
        if model == models.MessageStatus:
            return self.status_query
            
        q = MagicMock()
        q.with_for_update.return_value = q
        q.filter.return_value = q
        q.filter_by.return_value = q
        q.order_by.return_value = q

        if model == models.ScheduledTrigger:
            q.get.return_value = self.mock_trigger
            q.first.return_value = self.mock_trigger
        elif model == models.AppConfig:
            mock_conf = MagicMock()
            mock_conf.client_id = 1
            mock_conf.value = "test_value"
            q.first.return_value = mock_conf
            q.all.return_value = [mock_conf]
        else:
            q.first.return_value = None
            q.all.return_value = []
            
        return q

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commit_called = True

    def flush(self): pass
    def close(self): pass
    def rollback(self): pass
    def execute(self, *args, **kwargs):
        m = MagicMock()
        m.scalar.return_value = True
        return m
    def expire_all(self): pass
    def refresh(self, obj): pass

@pytest.mark.asyncio
async def test_handle_whatsapp_event_status_fallback_matches_by_phone():
    # Setup trigger
    mock_trigger = models.ScheduledTrigger(
        id=40,
        client_id=1,
        contact_phone="5585999999999",
        status="paused_waiting_delivery",
        is_bulk=False
    )
    
    # Message status has a Chatwoot numeric ID (e.g., '12345') instead of wamid
    mock_message_record = models.MessageStatus(
        id=500,
        message_id="12345",
        trigger_id=40,
        status="sent",
        phone_number="5585999999999",
        delivered_counted=False
    )

    db = MockSessionWithFallback(mock_message_record, mock_trigger)

    # Status update webhook payload
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "948132921713045"},
                    "statuses": [{
                        "id": "wamid.HBgMNTU4NTk5OTk5OTk5OQ==",
                        "status": "delivered",
                        "recipient_id": "5585999999999",
                        "timestamp": "1600000000"
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    with patch("core.worker.handlers.whatsapp.SessionLocal", return_value=db):
        with patch("core.worker.handlers.whatsapp.rabbitmq", new_callable=AsyncMock):
            with patch("asyncio.create_task"):
                await handle_whatsapp_event(payload)
                
                # Check that MessageStatus message_id was updated to the clean wamid
                assert mock_message_record.message_id == "HBgMNTU4NTk5OTk5OTk5OQ=="
                # Check that MessageStatus status was updated to delivered
                assert mock_message_record.status == "delivered"
                # Check that the DB commit was called
                assert db.commit_called is True

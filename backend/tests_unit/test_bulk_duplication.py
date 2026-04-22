import unittest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from services.bulk import process_bulk_send
import models

class TestBulkDuplication(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.mock_trigger = MagicMock(spec=models.ScheduledTrigger)
        self.mock_trigger.id = 123
        self.mock_trigger.client_id = 1
        self.mock_trigger.status = "pending"
        self.mock_trigger.processed_contacts = []
        self.mock_trigger.total_sent = 0
        self.mock_trigger.total_failed = 0
        self.mock_trigger.pending_contacts = []

        self.mock_session = MagicMock()
        
        def base_query(model):
            q = MagicMock()
            if model == models.ScheduledTrigger:
                q.get.return_value = self.mock_trigger
            elif model == models.BlockedContact.phone:
                q.filter().all.return_value = []
            elif model == models.MessageStatus.phone_number:
                q.filter().all.return_value = []
            elif model == models.ContactWindow:
                q.filter().all.return_value = []
            return q
            
        self.base_query_func = base_query
        self.mock_session.query.side_effect = base_query

    async def test_smart_send_duplication_prevention(self):
        """Bloqueia fallback se o erro não for de janela."""
        mock_chatwoot = AsyncMock()
        mock_chatwoot.send_text_direct.return_value = {"error": True, "detail": "Auth Error"}
        
        mock_window = MagicMock()
        mock_window.phone = "5585999999999"
        mock_window.last_interaction_at = datetime.now(timezone.utc) - timedelta(minutes=10)

        def custom_query(model):
            if model == models.ContactWindow:
                q = MagicMock()
                q.filter().all.return_value = [mock_window]
                return q
            return self.base_query_func(model)
        
        self.mock_session.query.side_effect = custom_query

        with patch("services.bulk.SessionLocal", return_value=self.mock_session), \
             patch("services.bulk.ChatwootClient", return_value=mock_chatwoot), \
             patch("services.bulk.rabbitmq.publish_event", new_callable=AsyncMock):
            
            await process_bulk_send(123, "tmpl", [{"phone": "5585999999999"}], 0, 1, direct_message="Oi")
            
            self.assertTrue(mock_chatwoot.send_text_direct.called)
            self.assertFalse(mock_chatwoot.send_template.called)

    async def test_bulk_idempotency_via_sent_phones(self):
        """Pula contatos já enviados."""
        mock_chatwoot = AsyncMock()
        mock_chatwoot.send_template.return_value = {"messages": [{"id": "ok"}]}
        
        def custom_query(model):
            if model == models.MessageStatus.phone_number:
                q = MagicMock()
                q.filter().all.return_value = [("sent_already",)]
                return q
            return self.base_query_func(model)
        self.mock_session.query.side_effect = custom_query

        with patch("services.bulk.SessionLocal", return_value=self.mock_session), \
             patch("services.bulk.ChatwootClient", return_value=mock_chatwoot), \
             patch("services.bulk.rabbitmq.publish_event", new_callable=AsyncMock):
            
            await process_bulk_send(123, "tmpl", [{"phone": "sent_already"}, {"phone": "new"}], 0, 2)

            self.assertEqual(mock_chatwoot.send_template.call_count, 1)
            self.assertEqual(mock_chatwoot.send_template.call_args[0][0], "new")

if __name__ == '__main__':
    unittest.main()

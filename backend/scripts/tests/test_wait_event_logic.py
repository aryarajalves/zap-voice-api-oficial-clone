import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from core.engine.nodes.wait_event import handle_wait_event_node
import models

class TestWaitEventNode(unittest.IsolatedAsyncioTestCase):
    async def test_wait_event_already_converted(self):
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        node = {"id": "node_wait_1", "data": {"eventType": "compra_aprovada", "waitValue": 1, "waitUnit": "hours"}}
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"

        # Mocking db filter query to return a processed WebhookHistory (successful conversion)
        mock_history = MagicMock()
        db.query().join().filter().first.return_value = mock_history

        res = await handle_wait_event_node(db, trigger, node, chatwoot, contact_phone)
        self.assertEqual(res, "realizado")

    async def test_wait_event_first_time_suspends(self):
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = datetime.now(timezone.utc)
        trigger.execution_history = []  # No prior suspension logs
        node = {"id": "node_wait_1", "data": {"eventType": "compra_aprovada", "waitValue": 1, "waitUnit": "hours"}}
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"

        # Simulate no webhook history found (no conversion yet)
        db.query().join().filter().first.return_value = None

        res = await handle_wait_event_node(db, trigger, node, chatwoot, contact_phone)
        self.assertEqual(res, "stop")
        self.assertEqual(trigger.status, "suspended")
        self.assertIsNotNone(trigger.scheduled_time)
        db.commit.assert_called()

    async def test_wait_event_time_expired(self):
        db = MagicMock()
        trigger = MagicMock()
        trigger.client_id = 1
        trigger.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
        # Log prior suspension 2 hours ago
        two_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        trigger.execution_history = [
            {"node_id": "node_wait_1", "status": "suspended", "timestamp": two_hours_ago}
        ]
        node = {"id": "node_wait_1", "data": {"eventType": "compra_aprovada", "waitValue": 1, "waitUnit": "hours"}}
        chatwoot = AsyncMock()
        contact_phone = "5585999999999"

        # Simulate no webhook history found
        db.query().join().filter().first.return_value = None

        res = await handle_wait_event_node(db, trigger, node, chatwoot, contact_phone)
        self.assertEqual(res, "nao_realizado")

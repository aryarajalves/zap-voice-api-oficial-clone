import unittest
from unittest.mock import MagicMock, AsyncMock, patch
import os
import sys
import time
from datetime import datetime, timezone

# Ensure backend path is in sys.path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_path)

# Mock rabbitmq_client PRE-IMPORT
mock_rabbitmq_publish = AsyncMock()
mock_rabbitmq_client = MagicMock()
mock_rabbitmq_client.rabbitmq.publish = mock_rabbitmq_publish
sys.modules["rabbitmq_client"] = mock_rabbitmq_client

# Mock environment variables
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import models
from services.engine import wait_for_delivery_sync

class TestInteractiveOptimization(unittest.IsolatedAsyncioTestCase):
    async def test_wait_for_delivery_sync_instant_for_interaction(self):
        """
        Verify that wait_for_delivery_sync returns immediately if trigger.is_interaction is True.
        """
        db = MagicMock()
        trigger = MagicMock()
        trigger.id = 123
        trigger.is_interaction = True
        
        message_id = "wamid.TEST123456"
        current_node_id = "node_1"
        
        start_time = time.time()
        # Call the function. It should NOT wait and should NOT check the DB in a loop.
        state, detail = await wait_for_delivery_sync(db, message_id, trigger, current_node_id, timeout=10)
        end_time = time.time()
        
        duration = end_time - start_time
        
        self.assertEqual(state, "delivered")
        self.assertEqual(detail, "Entregue (Interação)")
        self.assertLess(duration, 0.5, "Function should return instantly for interactive triggers")
        
        # Verify that DB was not queried (since it returns before the loop)
        self.assertFalse(db.query.called)

    async def test_wait_for_delivery_sync_normal_behavior(self):
        """
        Verify that wait_for_delivery_sync DOES NOT return immediately if trigger.is_interaction is False.
        """
        db = MagicMock()
        trigger = MagicMock()
        trigger.id = 456
        trigger.is_interaction = False # Normal trigger
        
        message_id = "wamid.TEST789"
        current_node_id = "node_2"
        
        # Setup mock DB to return None initially then 'delivered'
        # To speed up test, we simulate timeout or failure quickly
        
        # Mocking the loop by making time.time return values that simulate 1 second passed
        # and making the DB check return something
        
        status_record = MagicMock()
        status_record.status = 'delivered'
        
        q = MagicMock()
        q.filter.return_value = q
        q.first.return_value = status_record
        db.query.return_value = q
        
        state, detail = await wait_for_delivery_sync(db, message_id, trigger, current_node_id, timeout=5)
        
        self.assertEqual(state, "delivered")
        self.assertTrue(db.query.called, "DB query should be called for normal triggers")

if __name__ == "__main__":
    unittest.main()

# Mock rabbitmq_client before other imports
import sys
from unittest.mock import MagicMock
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()

# Mock config_loader for environment checks
sys.modules['config_loader'] = MagicMock()

import os
import unittest
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models

class TestManualInteraction(unittest.IsolatedAsyncioTestCase):
    async def test_manual_interaction_endpoint_success(self):
        """
        Tests the manual interaction endpoint triggers interaction funnel
        for list of provided phone numbers.
        """
        from routers.triggers.actions import trigger_manual_interaction, ManualInteractionPayload
        
        db = MagicMock()
        trigger_id = 999
        client_id = 1
        
        # Mock trigger
        trigger = models.ScheduledTrigger(
            id=trigger_id, 
            client_id=client_id, 
            is_bulk=True, 
            interaction_funnel_id=45,
            total_interactions=10
        )
        db.query.return_value.filter.return_value.first.return_value = trigger
        
        # Request body
        payload = ManualInteractionPayload(phones=["5511999999999", "5511988888888"])
        
        # Current user
        user = models.User(id=1, client_id=client_id)
        
        from unittest.mock import AsyncMock
        
        # Patch rabbitmq and manager emit
        with patch('routers.triggers.actions.rabbitmq.publish', new_callable=AsyncMock) as mock_publish, \
             patch('routers.triggers.actions.rabbitmq.publish_event', new_callable=AsyncMock) as mock_emit:
            
            result = await trigger_manual_interaction(
                trigger_id=trigger_id,
                payload=payload,
                db=db,
                current_user=user
            )
            
            # Verifications
            self.assertEqual(result["status"], "success")
            self.assertEqual(result["triggered_count"], 2)
            
            # Verify rabbitmq was called twice (once for each number)
            self.assertEqual(mock_publish.call_count, 2)
            
            # Verify websocket update was emitted
            mock_emit.assert_called_once()
            
            print("Verification successful: manual interaction enqueued successfully.")

if __name__ == "__main__":
    unittest.main()

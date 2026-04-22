import unittest
from unittest.mock import MagicMock, AsyncMock, patch
import os
import sys
import uuid
import json
from datetime import datetime, timezone

# Ensure backend path is in sys.path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_path)

# 1. Mock rabbitmq_client PRE-IMPORT
mock_rabbitmq_publish = AsyncMock()
mock_rabbitmq_client = MagicMock()
mock_rabbitmq_client.rabbitmq.publish = mock_rabbitmq_publish
sys.modules["rabbitmq_client"] = mock_rabbitmq_client

# 2. Mock environment variables
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import routers.webhooks_public
import models

# Final mock fix for SQLAlchemy column comparison
models.ScheduledTrigger.created_at = datetime.now(timezone.utc)

class TestFunnelInitiationFix(unittest.IsolatedAsyncioTestCase):
    async def test_immediate_dispatch_status_is_queued(self):
        from routers.webhooks_public import receive_external_webhook
        
        db = MagicMock()
        
        # Mock Integration
        integration_id = uuid.uuid4()
        integration = MagicMock()
        integration.id = integration_id
        integration.status = "active"
        integration.platform = "hotmart"
        integration.client_id = 1
        integration.product_filtering = False
        
        # Mock Mapping
        mapping = MagicMock()
        mapping.id = 1
        mapping.event_type = "compra_aprovada"
        mapping.template_name = "test_template"
        mapping.delay_minutes = 0
        mapping.delay_seconds = 0
        mapping.is_active = True
        mapping.funnel_id = 57
        mapping.product_name = "Test Product"
        mapping.chatwoot_label = "[]"
        mapping.use_product_match = False
        
        # Setup DB behavior
        q_mapping = MagicMock()
        q_mapping.filter.return_value = q_mapping
        q_mapping.all.return_value = [mapping]
        
        q_integ = MagicMock()
        q_integ.filter.return_value = q_integ
        q_integ.first.return_value = integration

        def mock_query(*args):
            if models.WebhookIntegration in args: return q_integ
            if models.WebhookEventMapping in args: return q_mapping
            if models.WebhookHistory in args:
                qh = MagicMock(); qh.filter.return_value = qh; qh.first.return_value = None; return qh
            if models.BlockedContact in args:
                qb = MagicMock(); qb.filter.return_value = qb; qb.first.return_value = None; return qb
            if models.ScheduledTrigger in args:
                qs = MagicMock(); qs.filter.return_value = qs; qs.update.return_value = 0; qs.first.return_value = None
                return qs
            return MagicMock()
            
        db.query = mock_query
        
        # Mock Request
        request = MagicMock()
        request.json = AsyncMock(return_value={
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {"name": "Test User", "checkout_phone": "5511999999999"},
                "purchase": {"status": "APPROVED"},
                "product": {"name": "Test Product"}
            }
        })
        
        # Reset publish mock
        mock_rabbitmq_publish.reset_mock()
        
        with patch('routers.webhooks_public.upsert_webhook_lead'), \
             patch('routers.webhooks_public.models.ScheduledTrigger') as MockST:
            
            # Setup ST mock return
            st_instance = MagicMock()
            st_instance.id = 789
            MockST.return_value = st_instance
            
            # Call
            bg = MagicMock()
            result = await receive_external_webhook(str(integration_id), request, bg, db)
            
            print(f"RESULT: {result}")
            
            # VERIFY
            self.assertEqual(result["status"], "success")
            self.assertTrue(MockST.called, "ScheduledTrigger should have been created")
            
            call_args = MockST.call_args.kwargs
            self.assertEqual(call_args["status"], "queued", "Status MUST be queued for immediate dispatch")
            
            self.assertTrue(mock_rabbitmq_publish.called, "RabbitMQ publish should have been triggered")
            print("SUCCESS: Fix verified. Status set to 'queued' and RabbitMQ published.")

if __name__ == "__main__":
    unittest.main()

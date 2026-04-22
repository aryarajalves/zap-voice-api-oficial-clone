import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

# Set VALID dummy env vars before anything else
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["RABBITMQ_URL"] = "amqp://guest:guest@localhost:5672//"

import pytest
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock rabbitmq_client before importing worker
mock_rabbitmq_client = MagicMock()
mock_rabbitmq = MagicMock()
mock_rabbitmq.publish = AsyncMock()
mock_rabbitmq.publish_event = AsyncMock()
mock_rabbitmq.connect = AsyncMock()
mock_rabbitmq.consume = AsyncMock()
mock_rabbitmq_client.rabbitmq = mock_rabbitmq
sys.modules["rabbitmq_client"] = mock_rabbitmq_client

# Mock database.py entirely to avoid any real DB logic
mock_db_module = MagicMock()
sys.modules["database"] = mock_db_module

import models
from worker import handle_whatsapp_event

@pytest.mark.anyio
async def test_delivery_triggers_memory_webhook_bulk_dispatch():
    """
    Test that in a BULK dispatch (where trigger.contact_phone is None), 
    the worker correctly resolves the phone and name from MessageStatus 
    and trigger.contacts_list before notifying the memory webhook.
    """
    mock_db = MagicMock()

    # Dummy classes to act as models
    class DummyTrigger:
        def __init__(self):
            self.id = 1
            self.client_id = 1
            self.contact_phone = None
            self.contact_name = None
            self.is_bulk = True
            self.cost_per_unit = 0.0
            self.total_sent = 0
            self.total_delivered = 0
            self.total_read = 0
            self.total_failed = 0
            self.total_cost = 0.0
            self.total_memory_sent = 0
            self.private_message_delay = 5
            self.contacts_list = [{"phone": "5511999999999", "{{1}}": "Joao Bulk"}]
            self.template_name = "test_template"
            self.template_components = [{"type": "body", "parameters": [{"text": "Joao Bulk"}]}]
            self.publish_external_event = True 
            self.label_added = False
            self.execution_history = []
            self.private_message_concurrency = 1

    class DummyMessage:
        def __init__(self, trigger):
            self.id = 100
            self.message_id = "wa_msg_id_123"
            self.trigger_id = 1
            self.phone_number = "5511999999999"
            self.status = "sent"
            self.memory_webhook_status = None
            self.meta_price_brl = 0.0
            self.trigger = trigger
            self.content = "[Template: test_template]"
            self.message_type = "TEMPLATE"
            self.delivered_counted = False
            self.private_note_posted = False
            self.pending_private_note = "Ola"
            self.meta_price_category = None
            self.updated_at = None

    mock_trigger = DummyTrigger()
    mock_message = DummyMessage(mock_trigger)
    
    # Setup mock template cache
    mock_tpl_cache = MagicMock()
    mock_tpl_cache.body = "Olá {{1}}"
    
    # Ensure model classes have attributes for filters
    if hasattr(models, 'AppConfig'):
        models.AppConfig.key = MagicMock()
        models.AppConfig.value = MagicMock()
        models.AppConfig.client_id = MagicMock()
    if hasattr(models, 'MessageStatus'):
        models.MessageStatus.message_id = MagicMock()
        models.MessageStatus.phone_number = MagicMock()
        models.MessageStatus.status = MagicMock()
        models.MessageStatus.memory_webhook_status = MagicMock()
    if hasattr(models, 'ScheduledTrigger'):
        models.ScheduledTrigger.id = MagicMock()
        models.ScheduledTrigger.client_id = MagicMock()

    # Simple query mock that returns our objects
    def query_mock(model):
        model_name = getattr(model, '__name__', str(model))
        
        # Fresh chain for each model
        chain = MagicMock()
        chain.filter.return_value = chain
        chain.with_for_update.return_value = chain
        
        if "MessageStatus" in model_name:
            chain.first.return_value = mock_message
            return chain
        elif "ScheduledTrigger" in model_name:
            chain.get.return_value = mock_trigger
            chain.first.return_value = mock_trigger
            return chain
        elif "WhatsAppTemplateCache" in model_name:
            chain.first.return_value = mock_tpl_cache
            return chain
        
        chain.first.return_value = None
        return chain

    mock_db.query.side_effect = query_mock
    mock_db.query.return_value.filter.return_value.update.return_value = 1
    
    meta_event = {
        "entry": [{
            "changes": [{
                "value": {
                    "statuses": [{
                        "id": "wa_msg_id_123",
                        "status": "delivered",
                        "recipient_id": "5511999999999"
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    
    with patch("worker.get_setting", return_value="http://memory-webhook.local"), \
         patch("worker.SessionLocal", return_value=mock_db), \
         patch("worker.notify_ai_memory", new_callable=AsyncMock), \
         patch("worker.notify_agent_memory_webhook", new_callable=AsyncMock) as mock_notify:
        
        await handle_whatsapp_event(meta_event)
        
        assert mock_notify.called, "Sincronização de memória não foi disparada."
        args, kwargs = mock_notify.call_args
        assert kwargs["phone"] == "5511999999999"
        assert kwargs["name"] == "Joao Bulk"
        
        print("SUCCESS: Automacao de memoria em Bulk validada com sucesso!")

if __name__ == "__main__":
    asyncio.run(test_delivery_triggers_memory_webhook_bulk_dispatch())

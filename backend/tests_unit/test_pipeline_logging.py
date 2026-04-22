import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
import models
from worker import handle_whatsapp_event

@pytest.mark.asyncio
async def test_handle_whatsapp_event_logs_stabilization_on_delivery(db_session):
    # 1. Setup Mock Trigger and MessageStatus
    trigger = models.ScheduledTrigger(
        id=999,
        client_id=1,
        status='paused_waiting_delivery',
        is_bulk=False,
        execution_history=[]
    )
    db_session.add(trigger)
    
    msg_status = models.MessageStatus(
        message_id="wamid.test_delivery_123",
        trigger_id=999,
        status='sent',
        phone_number="5511999999999",
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(msg_status)
    db_session.commit()

    # 2. Mock Payload
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "statuses": [{
                        "id": "wamid.test_delivery_123",
                        "status": "delivered",
                        "recipient_id": "5511999999999",
                        "timestamp": "1600000000"
                    }]
                }
            }]
        }]
    }

    # 3. Execute handler (mocking RabbitMQ to avoid connection errors)
    with patch("worker.rabbitmq.publish_event", new_callable=MagicMock) as mock_pub:
        # handle_whatsapp_event expects a dict
        await handle_whatsapp_event(payload)

    # 4. Verify Database
    db_session.refresh(trigger)
    
    history = trigger.execution_history
    node_ids = [h['node_id'] for h in history]
    
    assert "DELIVERY" in node_ids
    assert "STABILIZATION" in node_ids
    
    delivery_node = next(h for h in history if h['node_id'] == "DELIVERY")
    stabilization_node = next(h for h in history if h['node_id'] == "STABILIZATION")
    
    assert delivery_node['status'] == 'completed'
    assert stabilization_node['status'] == 'processing'
    assert "target_time" in stabilization_node['extra']
    print("✅ Pipeline logging verified: DELIVERY -> STABILIZATION transition confirmed.")

@pytest.mark.asyncio
async def test_bulk_send_initialization_logs(db_session):
    from services.bulk import process_bulk_send
    
    # Setup Trigger
    trigger = models.ScheduledTrigger(
        id=888,
        client_id=1,
        status='queued',
        is_bulk=True,
        execution_history=[]
    )
    db_session.add(trigger)
    db_session.commit()
    
    # Mock contacts list
    contacts = ["5511999999999"]
    
    with patch("services.bulk.ChatwootClient"), \
         patch("services.bulk.rabbitmq.publish_event"):
        # We only want to test the initialization part, so we'll mock the internal sending function
        # to return quickly or side-step the loop
        with patch("services.bulk.render_template_body", return_value="Test Content"):
             # Mocking the actual dispatch to avoid hitting Meta API
             with patch("services.bulk.ChatwootClient.send_template", return_value={"success": True, "id": "test_id"}):
                 await process_bulk_send(trigger_id=888, template_name="test", contacts=contacts, delay=0, concurrency=1)

    db_session.refresh(trigger)
    history = trigger.execution_history
    node_ids = [h['node_id'] for h in history]
    
    assert "DISCOVERY" in node_ids
    assert "DELIVERY" in node_ids
    
    delivery_node = next(h for h in history if h['node_id'] == "DELIVERY")
    assert delivery_node['status'] == 'completed'
    print("✅ Bulk send logging verified: DISCOVERY and DELIVERY nodes created.")

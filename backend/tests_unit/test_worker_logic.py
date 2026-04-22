import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from worker import handle_bulk_send, handle_funnel_execution, handle_chatwoot_private_message
import asyncio

@pytest.fixture
def mock_db():
    with patch("worker.SessionLocal") as mock:
        yield mock()

@pytest.fixture
def mock_rabbitmq():
    with patch("worker.rabbitmq") as mock:
        yield mock

@pytest.mark.asyncio
async def test_handle_bulk_send_funnel(mock_rabbitmq):
    data = {
        "trigger_id": 1,
        "type": "funnel_bulk",
        "funnel_id": 10,
        "contacts": ["5585999999999"],
        "delay": 5,
        "concurrency": 2
    }
    
    with patch("worker.process_bulk_funnel", new_callable=AsyncMock) as mock_process:
        await handle_bulk_send(data)
        mock_process.assert_called_once_with(
            trigger_id=1,
            funnel_id=10,
            contacts=["5585999999999"],
            delay=5,
            concurrency=2
        )

@pytest.mark.asyncio
async def test_handle_bulk_send_template(mock_rabbitmq):
    data = {
        "trigger_id": 2,
        "template_name": "hello_world",
        "contacts": ["5585999999999"],
        "delay": 10,
        "concurrency": 3,
        "language": "en_US"
    }
    
    with patch("worker.process_bulk_send", new_callable=AsyncMock) as mock_process:
        await handle_bulk_send(data)
        mock_process.assert_called_once_with(
            trigger_id=2,
            template_name="hello_world",
            contacts=["5585999999999"],
            delay=10,
            concurrency=3,
            language="en_US",
            components=None,
            direct_message=None,
            direct_message_params=None
        )

@pytest.mark.asyncio
async def test_handle_chatwoot_private_message_success(mock_db):
    data = {
        "client_id": 1,
        "phone": "5585999999999",
        "message": "Test private note",
        "trigger_id": 123
    }
    
    with patch("chatwoot_client.ChatwootClient") as MockClient:
        mock_client_inst = MockClient.return_value
        mock_client_inst.get_default_whatsapp_inbox = AsyncMock(return_value=1)
        mock_client_inst.ensure_conversation = AsyncMock(return_value=1000)
        mock_client_inst.is_within_24h_window = AsyncMock(return_value=True)
        mock_client_inst.send_message = AsyncMock()
        
        await handle_chatwoot_private_message(data)
        
        mock_client_inst.get_default_whatsapp_inbox.assert_called_once()
        mock_client_inst.ensure_conversation.assert_called_once()
        mock_client_inst.send_message.assert_called_once_with(1000, "Test private note", private=True)

@pytest.mark.asyncio
async def test_handle_funnel_execution_success(mock_db):
    data = {
        "trigger_id": 1,
        "contact_phone": "5585999999999",
        "conversation_id": 1000,
        "funnel_id": 10
    }
    
    mock_trigger = MagicMock()
    mock_trigger.id = 1
    mock_trigger.status = "pending"
    mock_trigger.client_id = 1
    mock_trigger.integration_id = None
    mock_trigger.funnel_id = 10
    
    # First query for trigger
    mock_db.query.return_value.filter.return_value.first.return_value = mock_trigger
    
    with patch("worker.execute_funnel", new_callable=AsyncMock) as mock_execute:
        await handle_funnel_execution(data)
        mock_execute.assert_called_once()

@pytest.mark.asyncio
async def test_handle_funnel_execution_suppression(mock_db):
    data = {
        "trigger_id": 1,
        "contact_phone": "5585999999999",
        "conversation_id": 1000
    }
    
    # Trigger to be suppressed
    mock_trigger = MagicMock()
    mock_trigger.id = 1
    mock_trigger.status = "pending"
    mock_trigger.client_id = 1
    mock_trigger.integration_id = 50
    mock_trigger.event_type = "PURCHASE_COMPLETED"
    mock_trigger.product_name = "Product A"
    
    # Mocking the sequence of DB calls
    # 1. Fetch trigger
    # 2. Fetch suppressor mappings
    # 3. Check for superior reached
    
    mock_mapping = MagicMock()
    mock_mapping.event_type = "ORDER_REFUNDED" # Suppose this cancels PURCHASE_COMPLETED
    
    mock_superior = MagicMock()
    mock_superior.event_type = "ORDER_REFUNDED"
    
    # Using side_effect to return different things for different queries is hard with this chaining
    # Better to patch the query objects directly or use a more robust mock
    
    with patch("worker.execute_funnel", new_callable=AsyncMock) as mock_execute:
        # Simplified: just test that it stops if it finds a suppressor
        # In worker.py, Step 158: suppressor_mappings = db.query(models.WebhookEventMapping.event_type)...
        
        # We'll mock the filter results in order
        mock_db.query.return_value.filter.return_value.first.side_effect = [mock_trigger, mock_superior]
        mock_db.query.return_value.filter.return_value.all.return_value = [("ORDER_REFUNDED",)]
        
        await handle_funnel_execution(data)
        
        # Should NOT execute funnel
        mock_execute.assert_not_called()
        assert mock_trigger.status == "cancelled"

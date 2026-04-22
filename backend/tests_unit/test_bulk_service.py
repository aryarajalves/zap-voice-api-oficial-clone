import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from services.bulk import process_bulk_send, process_bulk_funnel, render_template_body
import asyncio
from datetime import datetime, timezone

@pytest.fixture
def mock_db():
    with patch("services.bulk.SessionLocal") as mock:
        db_inst = mock.return_value
        yield db_inst

@pytest.fixture
def mock_rabbitmq():
    with patch("services.bulk.rabbitmq") as mock:
        mock.publish_event = AsyncMock()
        yield mock

@pytest.fixture
def mock_chatwoot():
    with patch("services.bulk.ChatwootClient") as mock:
        yield mock.return_value

@pytest.mark.asyncio
async def test_render_template_body():
    body = "Hello {{1}}, your order {{2}} is ready."
    components = [
        {
            "type": "body",
            "parameters": [
                {"text": "John"},
                {"text": "12345"}
            ]
        }
    ]
    result = render_template_body(body, components)
    assert result == "Hello John, your order 12345 is ready."

@pytest.mark.asyncio
async def test_process_bulk_send_empty_contacts(mock_db, mock_rabbitmq):
    # No contacts should mark as completed
    mock_trigger = MagicMock()
    mock_db.query.return_value.get.return_value = mock_trigger
    
    await process_bulk_send(trigger_id=1, template_name="test", contacts=[], delay=0, concurrency=1)
    
    assert mock_trigger.status == "completed"
    assert mock_trigger.total_sent == 0

@pytest.mark.asyncio
async def test_process_bulk_send_success(mock_db, mock_chatwoot, mock_rabbitmq):
    # Mocking trigger
    mock_trigger = MagicMock()
    mock_trigger.id = 1
    mock_trigger.client_id = 1
    mock_trigger.status = "pending"
    mock_trigger.private_message = None
    mock_trigger.processed_contacts = []
    
    # Mocking DB query chain: .get(1) - enough for multiple loop iterations
    mock_db.query.return_value.get.return_value = mock_trigger
    # Mocking BlockedContact query
    mock_db.query.return_value.filter.return_value.all.return_value = []
    # Mocking WhatsAppTemplateCache query (Turbo Send)
    mock_db.query.return_value.filter.return_value.first.return_value = None
    # Mocking ContactWindow query (Smart Send)
    mock_db.query.return_value.filter.return_value.all.return_value = []

    mock_chatwoot.send_template = AsyncMock(return_value={"messages": [{"id": "wamid.test123"}]})
    
    contacts = ["5585999999991", "5585999999992"]
    
    with patch("asyncio.sleep", return_value=None):
        await process_bulk_send(
            trigger_id=1,
            template_name="hello_world",
            contacts=contacts,
            delay=1,
            concurrency=2 # Use concurrency 2 to have only 1 batch iteration
        )
    
    assert mock_chatwoot.send_template.call_count == 2
    assert mock_trigger.status == "completed"

@pytest.mark.asyncio
async def test_process_bulk_send_blocked(mock_db, mock_chatwoot, mock_rabbitmq):
    mock_trigger = MagicMock()
    mock_trigger.id = 1
    mock_trigger.client_id = 1
    mock_trigger.status = "pending"
    mock_trigger.processed_contacts = []
    
    # Provide values via return_value instead of side_effect if they don't need to change
    mock_db.query.return_value.get.return_value = mock_trigger
    
    # Mock blocked contact
    mock_blocked = MagicMock()
    mock_blocked.phone = "5585999999991"
    
    # Needs to handle multiple queries in sequence
    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [mock_blocked], # For blocked list check
        []              # For interaction check
    ]
    mock_db.query.return_value.filter_by.return_value.first.return_value = None
    mock_db.query.return_value.filter.return_value.first.return_value = None # WhatsAppTemplateCache

    contacts = ["5585999999991"]
    
    await process_bulk_send(
        trigger_id=1,
        template_name="hello_world",
        contacts=contacts,
        delay=0,
        concurrency=1
    )
    
    # Should NOT call send_template
    assert mock_chatwoot.send_template.call_count == 0
    assert mock_trigger.total_failed == 1

@pytest.mark.asyncio
async def test_process_bulk_funnel_success(mock_db, mock_rabbitmq):
    mock_trigger = MagicMock()
    mock_trigger.id = 1
    mock_trigger.client_id = 1
    mock_trigger.status = "pending"
    
    mock_db.query.return_value.get.return_value = mock_trigger
    # Blocked list query
    mock_db.query.return_value.filter.return_value.all.return_value = []
    
    contacts = ["5585999999991"]
    
    with patch("services.bulk.execute_funnel", new_callable=AsyncMock) as mock_exec:
        with patch("asyncio.sleep", return_value=None):
            await process_bulk_funnel(
                trigger_id=1,
                funnel_id=10,
                contacts=contacts,
                delay=0,
                concurrency=1
            )
        mock_exec.assert_called_once()
    
    assert mock_trigger.status == "completed"
    assert mock_trigger.total_sent == 1

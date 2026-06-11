import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from services.bulk import process_bulk_send
import asyncio

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
async def test_process_bulk_send_meta_server_error_no_retry(mock_db, mock_chatwoot, mock_rabbitmq):
    # Setup mock trigger
    mock_trigger = MagicMock()
    mock_trigger.id = 1
    mock_trigger.client_id = 1
    mock_trigger.status = "pending"
    mock_trigger.private_message = None
    mock_trigger.processed_contacts = []
    
    mock_db.query.return_value.get.return_value = mock_trigger
    mock_db.query.return_value.filter.return_value.all.return_value = []
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    contacts = ["5585999999991"]

    # We mock send_smart_message to always return the Meta server error
    mock_send = AsyncMock(return_value={
        "error": True,
        "detail": "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)"
    })

    # Mock MessageStatus instantiation to see what arguments it gets
    # and mock update_trigger_stats to avoid DB errors
    with patch("services.bulk.send_smart_message", mock_send), \
         patch("services.bulk.update_trigger_stats") as mock_stats, \
         patch("services.bulk.models.MessageStatus") as mock_msg_status, \
         patch("asyncio.sleep", return_value=None):
        
        await process_bulk_send(
            trigger_id=1,
            template_name="hello_world",
            contacts=contacts.copy(),
            delay=0,
            concurrency=1
        )
    
    # It should have been called only once (no retries)
    assert mock_send.call_count == 1
    
    # Verify that the failure_reason recorded in models.MessageStatus is the direct error reason
    called_reasons = [call.kwargs.get("failure_reason") for call in mock_msg_status.call_args_list]
    assert "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)" in called_reasons


import pytest
import asyncio
from unittest.mock import MagicMock, patch
from core.worker.handlers.bulk import handle_bulk_send, ACTIVE_TRIGGERS

@pytest.mark.asyncio
async def test_handle_bulk_send_clears_active_lock_on_exception():
    trigger_id = 99999
    data = {"trigger_id": trigger_id, "type": "bulk"}
    
    mock_session = MagicMock()
    # Simula o lock retornando None para acionar saída prematura
    mock_session.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = None

    with patch("core.worker.handlers.bulk.SessionLocal", return_value=mock_session):
        await handle_bulk_send(data)
        
        # Garante que o lock local foi removido
        assert trigger_id not in ACTIVE_TRIGGERS

@pytest.mark.asyncio
async def test_handle_bulk_send_handles_timeout_error():
    trigger_id = 88888
    data = {"trigger_id": trigger_id, "type": "bulk"}
    
    mock_trigger = MagicMock()
    mock_trigger.status = "processing"
    
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = mock_trigger
    mock_session.query.return_value.get.return_value = mock_trigger

    with patch("core.worker.handlers.bulk.SessionLocal", return_value=mock_session), \
         patch("core.worker.handlers.bulk.process_bulk_send", side_effect=asyncio.TimeoutError()):
        
        await handle_bulk_send(data)
        
        # Garante que o trigger_id não permanece em ACTIVE_TRIGGERS após o timeout
        assert trigger_id not in ACTIVE_TRIGGERS
        # Garante que o status do trigger foi alterado para failed
        assert mock_trigger.status == "failed"

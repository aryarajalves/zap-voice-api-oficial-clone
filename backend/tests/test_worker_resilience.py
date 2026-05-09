import pytest
from unittest.mock import MagicMock, patch
from core.worker.handlers.whatsapp import handle_whatsapp_event
import asyncio

@pytest.mark.asyncio
async def test_handle_whatsapp_event_closes_session_on_error():
    # Mock data
    data = {"entry": [{"changes": [{"value": {"statuses": [{"id": "123", "status": "delivered"}]}}]}]}
    
    # Mock SessionLocal and session instance
    mock_session = MagicMock()
    
    with patch("backend.core.worker.handlers.whatsapp.SessionLocal", return_value=mock_session), \
         patch("backend.core.worker.handlers.whatsapp.models.AppConfig") as mock_app_config:
        
        # Simular um erro durante a query
        mock_session.query.side_effect = Exception("Database connection error")
        
        # Executar o handler
        await handle_whatsapp_event(data)
        
        # Verificar se close() foi chamado no finally
        mock_session.close.assert_called_once()

@pytest.mark.asyncio
async def test_handle_whatsapp_event_closes_session_on_success():
    # Mock data
    data = {"entry": [{"changes": [{"value": {"statuses": [{"id": "123", "status": "delivered"}]}}]}]}
    
    # Mock SessionLocal and session instance
    mock_session = MagicMock()
    
    with patch("backend.core.worker.handlers.whatsapp.SessionLocal", return_value=mock_session):
        # Configurar retorno vazio para não fazer nada mas completar com sucesso
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        # Executar o handler
        await handle_whatsapp_event(data)
        
        # Verificar se close() foi chamado no final
        mock_session.close.assert_called()

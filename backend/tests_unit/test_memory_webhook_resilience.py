import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ['DATABASE_URL'] = 'sqlite://'

from core.worker.handlers.memory import handle_agent_memory_webhook

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
@patch('core.worker.handlers.memory.SessionLocal')
@patch('core.worker.handlers.memory.get_setting')
@patch('httpx.AsyncClient.post')
async def test_memory_webhook_success(mock_post, mock_get_setting, mock_session_local):
    mock_get_setting.return_value = 'https://agentebacktarcira.aryaraj.shop/webhooks/memory/memoria'
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_post.return_value = mock_resp

    mock_db = MagicMock()
    mock_session_local.return_value = mock_db

    payload = {
        'client_id': 1,
        'contact_phone': '5585998259497',
        'content': 'teste de mensagem',
        'dono': 'atendente'
    }

    # Deve executar sem levantar exceção (ACK na fila)
    await handle_agent_memory_webhook(payload)
    mock_post.assert_called_once()
    assert mock_db.close.called

@pytest.mark.anyio
@patch('core.worker.handlers.memory.SessionLocal')
@patch('core.worker.handlers.memory.get_setting')
@patch('httpx.AsyncClient.post')
async def test_memory_webhook_timeout_raises_for_retry(mock_post, mock_get_setting, mock_session_local):
    mock_get_setting.return_value = 'https://agentebacktarcira.aryaraj.shop/webhooks/memory/memoria'
    mock_post.side_effect = httpx.ReadTimeout('Read timed out')

    mock_db = MagicMock()
    mock_session_local.return_value = mock_db

    payload = {
        'client_id': 1,
        'contact_phone': '5585998259497',
        'content': 'teste de mensagem',
        'dono': 'atendente'
    }

    with pytest.raises(httpx.RequestError):
        await handle_agent_memory_webhook(payload)
    
    assert mock_db.close.called

@pytest.mark.anyio
@patch('core.worker.handlers.memory.SessionLocal')
@patch('core.worker.handlers.memory.get_setting')
@patch('httpx.AsyncClient.post')
async def test_memory_webhook_500_error_raises_for_retry(mock_post, mock_get_setting, mock_session_local):
    mock_get_setting.return_value = 'https://agentebacktarcira.aryaraj.shop/webhooks/memory/memoria'
    mock_resp = MagicMock()
    mock_resp.status_code = 503
    mock_post.return_value = mock_resp

    mock_db = MagicMock()
    mock_session_local.return_value = mock_db

    payload = {
        'client_id': 1,
        'contact_phone': '5585998259497',
        'content': 'teste de mensagem',
        'dono': 'atendente'
    }

    with pytest.raises(RuntimeError):
        await handle_agent_memory_webhook(payload)
    
    assert mock_db.close.called

@pytest.mark.anyio
@patch('core.worker.handlers.memory.SessionLocal')
@patch('core.worker.handlers.memory.get_setting')
@patch('httpx.AsyncClient.post')
async def test_memory_webhook_400_error_does_not_raise(mock_post, mock_get_setting, mock_session_local):
    mock_get_setting.return_value = 'https://agentebacktarcira.aryaraj.shop/webhooks/memory/memoria'
    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_post.return_value = mock_resp

    mock_db = MagicMock()
    mock_session_local.return_value = mock_db

    payload = {
        'client_id': 1,
        'contact_phone': '5585998259497',
        'content': 'teste de mensagem',
        'dono': 'atendente'
    }

    await handle_agent_memory_webhook(payload)
    assert mock_db.close.called

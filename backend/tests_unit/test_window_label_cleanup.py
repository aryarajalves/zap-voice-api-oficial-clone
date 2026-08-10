import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
from datetime import datetime, timezone, timedelta

# Adjust path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import models
from services.scheduler import run_closed_window_label_cleanup

@pytest.mark.asyncio
@patch("services.scheduler.rabbitmq")
async def test_run_closed_window_label_cleanup_no_configs(mock_rabbitmq):
    """Garante que nao faz nada se nao houver configs no banco."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []
    
    # Executa
    await run_closed_window_label_cleanup(db_session=mock_db)
    
    # Verifica que nao buscou conversas
    mock_db.commit.assert_not_called()
    mock_rabbitmq.publish_event.assert_not_called()


@pytest.mark.asyncio
@patch("services.scheduler.rabbitmq")
async def test_run_closed_window_label_cleanup_window_open(mock_rabbitmq):
    """Garante que nao remove etiquetas se a janela de 24h estiver aberta."""
    mock_db = MagicMock()
    
    # Config
    mock_config = MagicMock()
    mock_config.client_id = 1
    mock_config.value = "24-horas, robo"
    
    # Conversa com janela aberta (mensagem ha 1 hora)
    mock_convo = MagicMock()
    mock_convo.id = 100
    mock_convo.client_id = 1
    mock_convo.status = "open"
    mock_convo.labels = ["24-horas", "suporte"]
    mock_convo.last_contact_message_at = datetime.now(timezone.utc) - timedelta(hours=1)
    
    def mock_query(model):
        q = MagicMock()
        q.filter.return_value = q
        if model == models.AppConfig:
            q.all.return_value = [mock_config]
        elif model == models.ChatConversation:
            q.all.return_value = [mock_convo]
        return q

    mock_db.query.side_effect = mock_query
    
    # Executa
    await run_closed_window_label_cleanup(db_session=mock_db)
    
    # Nao deve ter atualizado no banco
    mock_db.commit.assert_not_called()
    mock_rabbitmq.publish_event.assert_not_called()
    assert mock_convo.labels == ["24-horas", "suporte"]


@pytest.mark.asyncio
@patch("services.scheduler.rabbitmq")
async def test_run_closed_window_label_cleanup_window_closed(mock_rabbitmq):
    """Garante que remove as etiquetas se a janela de 24h estiver fechada (mais de 24h)."""
    mock_rabbitmq.publish_event = AsyncMock()
    mock_db = MagicMock()
    
    # Config
    mock_config = MagicMock()
    mock_config.client_id = 1
    mock_config.value = "24-horas, robo"
    
    # Conversa com janela fechada (mensagem ha 26 horas)
    mock_convo = MagicMock()
    mock_convo.id = 100
    mock_convo.client_id = 1
    mock_convo.status = "open"
    mock_convo.labels = ["24-horas", "suporte", "robo"]
    mock_convo.last_contact_message_at = datetime.now(timezone.utc) - timedelta(hours=26)
    
    def mock_query(model):
        q = MagicMock()
        q.filter.return_value = q
        if model == models.AppConfig:
            q.all.return_value = [mock_config]
        elif model == models.ChatConversation:
            q.all.return_value = [mock_convo]
        return q

    mock_db.query.side_effect = mock_query
    
    # Executa
    await run_closed_window_label_cleanup(db_session=mock_db)
    
    # Deve ter adicionado a mensagem de sistema no banco
    mock_db.add.assert_called_once()
    sys_msg = mock_db.add.call_args[0][0]
    assert isinstance(sys_msg, models.ChatMessage)
    assert sys_msg.conversation_id == 100
    assert sys_msg.sender_type == "system"
    assert "O sistema removeu marcador(es) por expiração da janela de 24h" in sys_msg.content
    assert "24-horas, robo" in sys_msg.content
    
    # Deve ter comitado
    mock_db.commit.assert_called_once()
    
    # Deve ter publicado os eventos new_message e conversation_updated via WebSocket
    assert mock_rabbitmq.publish_event.call_count == 2
    events_published = [call_args[0][0] for call_args in mock_rabbitmq.publish_event.call_args_list]
    assert "new_message" in events_published
    assert "conversation_updated" in events_published
    
    # As etiquetas 24-horas e robo foram removidas, sobrando apenas suporte
    assert mock_convo.labels == ["suporte"]

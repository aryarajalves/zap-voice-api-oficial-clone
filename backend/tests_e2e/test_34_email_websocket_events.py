
"""
test_34_email_websocket_events.py
Testes unitários para eventos de WebSocket publicados pelo Scheduler de E-mail.
"""

import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


class TestEmailWebSocketEvents:
    @pytest.mark.asyncio
    async def test_scheduler_emite_evento_websocket_na_execucao(self):
        """Mapeia se o scheduler publica evento email_dispatch_updated via RabbitMQ."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 50
        mock_dispatch.client_id = 1
        mock_dispatch.template_id = 1
        mock_dispatch.total_contacts = 1
        mock_dispatch.total_sent = 0
        mock_dispatch.total_failed = 0
        mock_dispatch.contacts_list = [{"email": "test@example.com", "name": "Test"}]

        mock_config = MagicMock()
        mock_template = MagicMock()
        mock_template.subject = "Assunto WS"
        mock_template.body_html = "<p>Conteudo WS</p>"

        with patch("services.scheduler.SessionLocal") as mock_session_cls, \
             patch("services.scheduler.send_single_email", new_callable=AsyncMock) as mock_send, \
             patch("services.scheduler.rabbitmq.publish_event", new_callable=AsyncMock) as mock_pub_event:

            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.all.return_value = [mock_dispatch]
            mock_db.query.return_value.filter_by.return_value.first.side_effect = [mock_config, mock_template]
            mock_session_cls.return_value = mock_db
            mock_send.return_value = {"success": True}

            from services.scheduler import process_scheduled_email_dispatches
            await process_scheduled_email_dispatches()

            # Deve ter emitido pelo menos o status 'processing' e o status final 'completed'
            assert mock_pub_event.call_count >= 2
            event_types = [call.args[0] for call in mock_pub_event.call_args_list]
            assert all(et == "email_dispatch_updated" for et in event_types)

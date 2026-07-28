
"""
test_35_email_status_webhook.py
Testes unitários para a rota POST /api/email/status-webhook (recebe webhooks de status de entrega da Brevo/SES).
"""

import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


class TestEmailStatusWebhook:
    @pytest.mark.asyncio
    async def test_receive_email_status_event_delivered(self):
        """Testa o processamento do evento 'delivered' vindo da Brevo."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 1
        mock_dispatch.client_id = 1
        mock_dispatch.contacts_list = [
            {"email": "lead1@example.com", "status": "sent"},
            {"email": "lead2@example.com", "status": "sent"}
        ]

        mock_request = MagicMock()
        mock_request.json = AsyncMock(return_value={
            "event": "delivered",
            "email": "lead1@example.com"
        })

        mock_db = MagicMock()
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_dispatch]

        with patch("routers.email_marketing.rabbitmq.publish_event", new_callable=AsyncMock) as mock_pub:
            from routers.email_marketing import receive_email_status_event
            res = await receive_email_status_event(request=mock_request, db=mock_db)

            assert res["status"] == "success"
            assert mock_dispatch.contacts_list[0]["status"] == "delivered"
            mock_db.commit.assert_called_once()
            mock_pub.assert_called_once()

    @pytest.mark.asyncio
    async def test_receive_email_status_event_hard_bounce(self):
        """Testa o processamento do evento 'hard_bounce' vindo da Brevo."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 2
        mock_dispatch.client_id = 1
        mock_dispatch.contacts_list = [
            {"email": "invalido@example.com", "status": "sent"}
        ]

        mock_request = MagicMock()
        mock_request.json = AsyncMock(return_value=[{
            "event": "hard_bounce",
            "email": "invalido@example.com",
            "reason": "Mailbox not found"
        }])

        mock_db = MagicMock()
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_dispatch]

        with patch("routers.email_marketing.rabbitmq.publish_event", new_callable=AsyncMock):
            from routers.email_marketing import receive_email_status_event
            res = await receive_email_status_event(request=mock_request, db=mock_db)

            assert res["status"] == "success"
            assert mock_dispatch.contacts_list[0]["status"] == "failed"
            assert mock_dispatch.contacts_list[0]["failure_reason"] == "Mailbox not found"
            mock_db.commit.assert_called_once()

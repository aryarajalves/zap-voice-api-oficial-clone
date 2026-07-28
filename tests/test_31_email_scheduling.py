
import sys
import os
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
TOKEN = os.getenv("TEST_TOKEN", "")
CLIENT_ID = os.getenv("TEST_CLIENT_ID", "1")


def get_headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "X-Client-ID": CLIENT_ID,
    }


class TestEmailBulkSendPayloadSchema:
    """Testa o schema Pydantic EmailBulkSendPayload com campo scheduled_at."""

    def test_payload_com_scheduled_at_valido(self):
        from routers.email_marketing import EmailBulkSendPayload
        future = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        payload = EmailBulkSendPayload(template_id=1, title="Campanha Teste", scheduled_at=future)
        assert payload.scheduled_at is not None

    def test_payload_sem_scheduled_at(self):
        from routers.email_marketing import EmailBulkSendPayload
        payload = EmailBulkSendPayload(template_id=1, title="Campanha Imediata")
        assert payload.scheduled_at is None

    def test_payload_campos_obrigatorios(self):
        from routers.email_marketing import EmailBulkSendPayload
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            EmailBulkSendPayload(title="Sem template")

    def test_payload_com_tag_name(self):
        from routers.email_marketing import EmailBulkSendPayload
        payload = EmailBulkSendPayload(template_id=5, title="Campanha Segmentada", tag_name="vip")
        assert payload.tag_name == "vip"


class TestScheduledDispatchLogic:
    """Testa a lógica de detecção de agendamento e parse de data/hora."""

    def test_disparo_agendado_e_detectado(self):
        from routers.email_marketing import EmailBulkSendPayload
        payload = EmailBulkSendPayload(
            template_id=1,
            title="Campanha Agendada",
            scheduled_at=(datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
        )
        is_scheduled = bool(payload.scheduled_at and str(payload.scheduled_at).strip())
        assert is_scheduled is True

    def test_disparo_imediato_nao_e_agendado(self):
        from routers.email_marketing import EmailBulkSendPayload
        payload = EmailBulkSendPayload(template_id=1, title="Imediato", scheduled_at=None)
        is_scheduled = bool(payload.scheduled_at and str(payload.scheduled_at).strip())
        assert is_scheduled is False

    def test_parse_formato_sem_segundos(self):
        """yyyy-MM-ddTHH:mm (sem segundos) deve ser aceito após completar com :00."""
        raw = "2030-12-31T15:30"
        if len(raw) == 16:
            raw += ":00"
        dt = datetime.fromisoformat(raw)
        assert dt.year == 2030 and dt.hour == 15 and dt.minute == 30

    def test_parse_formato_com_timezone(self):
        """ISO 8601 com offset de timezone deve ser parseado sem erros."""
        raw = "2030-06-15T10:00:00+00:00"
        dt = datetime.fromisoformat(raw)
        assert dt.tzinfo is not None

    def test_scheduled_at_vazio_nao_e_agendado(self):
        """scheduled_at vazio ou só espaços não deve ser tratado como agendamento."""
        for val in ["", "   ", None]:
            is_scheduled = bool(val and str(val).strip())
            assert is_scheduled is False


class TestProcessScheduledEmailDispatches:
    """Testa a função process_scheduled_email_dispatches do scheduler."""

    @pytest.mark.asyncio
    async def test_sem_dispatches_agendados_nao_faz_nada(self):
        """Quando não há dispatches vencidos, nenhum commit deve ocorrer."""
        with patch("services.scheduler.SessionLocal") as mock_session_cls:
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.all.return_value = []
            mock_session_cls.return_value = mock_db
            from services.scheduler import process_scheduled_email_dispatches
            await process_scheduled_email_dispatches()
            mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_dispatch_vencido_e_processado(self):
        """Dispatch com scheduled_time vencido deve ser enviado e marcado como completed."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 99
        mock_dispatch.client_id = 1
        mock_dispatch.template_id = 1
        mock_dispatch.total_contacts = 1
        mock_dispatch.contacts_list = [{"email": "test@example.com", "name": "Test"}]

        mock_config = MagicMock()
        mock_template = MagicMock()
        mock_template.subject = "Assunto Agendado"
        mock_template.body_html = "<p>Ola</p>"

        with patch("services.scheduler.SessionLocal") as mock_session_cls, \
             patch("services.scheduler.send_single_email", new_callable=AsyncMock) as mock_send:
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.all.return_value = [mock_dispatch]
            mock_db.query.return_value.filter_by.return_value.first.side_effect = [mock_config, mock_template]
            mock_session_cls.return_value = mock_db
            mock_send.return_value = {"success": True}

            from services.scheduler import process_scheduled_email_dispatches
            await process_scheduled_email_dispatches()

            mock_send.assert_called_once()
            assert mock_dispatch.total_sent == 1
            assert mock_dispatch.total_failed == 0
            assert mock_dispatch.status == "completed"

    @pytest.mark.asyncio
    async def test_dispatch_com_falhas_marcado_como_completed_with_errors(self):
        """Se alguns envios falharem, status deve ser completed_with_errors."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 98
        mock_dispatch.client_id = 1
        mock_dispatch.template_id = 1
        mock_dispatch.contacts_list = [
            {"email": "ok@example.com"},
            {"email": "fail@example.com"},
        ]

        mock_config = MagicMock()
        mock_template = MagicMock()
        mock_template.subject = "Assunto"
        mock_template.body_html = "<p>Ola</p>"

        call_count = [0]

        async def mock_send_fn(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {"success": True}
            return {"success": False, "error": "SMTP timeout"}

        with patch("services.scheduler.SessionLocal") as mock_session_cls, \
             patch("services.scheduler.send_single_email", side_effect=mock_send_fn):
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.all.return_value = [mock_dispatch]
            mock_db.query.return_value.filter_by.return_value.first.side_effect = [mock_config, mock_template]
            mock_session_cls.return_value = mock_db

            from services.scheduler import process_scheduled_email_dispatches
            await process_scheduled_email_dispatches()

            assert mock_dispatch.total_sent == 1
            assert mock_dispatch.total_failed == 1
            assert mock_dispatch.status == "completed_with_errors"

    @pytest.mark.asyncio
    async def test_dispatch_falha_sem_config_de_email(self):
        """Dispatch sem EmailConfig deve ser marcado como failed."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 100
        mock_dispatch.client_id = 2
        mock_dispatch.contacts_list = [{"email": "fail@example.com"}]

        with patch("services.scheduler.SessionLocal") as mock_session_cls:
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.all.return_value = [mock_dispatch]
            mock_db.query.return_value.filter_by.return_value.first.return_value = None  # sem config
            mock_session_cls.return_value = mock_db

            from services.scheduler import process_scheduled_email_dispatches
            await process_scheduled_email_dispatches()

            assert mock_dispatch.status == "failed"
            assert "Configura" in mock_dispatch.failure_reason

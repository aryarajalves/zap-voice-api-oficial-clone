"""
Testes unitarios para o webhook_retry_worker (services/webhook_retry_worker.py).
Valida logica de backoff, contagem de tentativas e transicoes de status.
"""
import os
os.environ["TESTING"] = "true"
os.environ["SECRET_KEY"] = "chave-de-teste-super-segura-com-32-caracteres-ok"

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call

from services.webhook_retry_worker import (
    _compute_next_retry_at,
    BACKOFF_MINUTES,
    MAX_RETRIES,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_msg(status="failed", retry_count=0, retry_at=None, conversation_id=1, msg_id=10):
    """Cria um mock de ChatMessage com os campos relevantes."""
    msg = MagicMock()
    msg.id = msg_id
    msg.conversation_id = conversation_id
    msg.agentflow_webhook_status = status
    msg.agentflow_retry_count = retry_count
    msg.agentflow_retry_at = retry_at
    msg.agentflow_webhook_error = None
    msg.sender_type = "contact"
    msg.message_type = "text"
    msg.content = "Ola"
    msg.media_url = None
    msg.timestamp = datetime.now(timezone.utc)
    msg.meta_data = {}
    return msg


def _make_convo(client_id=1, phone="5511999990000"):
    convo = MagicMock()
    convo.client_id = client_id
    convo.phone = phone
    convo.contact_name = "Teste"
    convo.labels = []
    convo.last_contact_message_at = None
    return convo


# ── Testes de backoff ──────────────────────────────────────────────────────────

class TestComputeNextRetryAt:
    def test_primeiro_retry_aguarda_2_minutos(self):
        """retry_count=0 (1a tentativa feita) → proximo em 2 min."""
        before = datetime.now(timezone.utc)
        result = _compute_next_retry_at(0)
        expected_min = before + timedelta(minutes=BACKOFF_MINUTES[0])
        diff = abs((result - expected_min).total_seconds())
        assert diff < 2, f"Esperado ~{BACKOFF_MINUTES[0]}min, obtido diferenca de {diff}s"

    def test_segundo_retry_aguarda_8_minutos(self):
        """retry_count=1 (2a tentativa feita) → proximo em 8 min."""
        before = datetime.now(timezone.utc)
        result = _compute_next_retry_at(1)
        expected_min = before + timedelta(minutes=BACKOFF_MINUTES[1])
        diff = abs((result - expected_min).total_seconds())
        assert diff < 2

    def test_terceiro_retry_aguarda_32_minutos(self):
        """retry_count=2 (3a tentativa feita) → proximo em 32 min."""
        before = datetime.now(timezone.utc)
        result = _compute_next_retry_at(2)
        expected_min = before + timedelta(minutes=BACKOFF_MINUTES[2])
        diff = abs((result - expected_min).total_seconds())
        assert diff < 2

    def test_backoff_nao_ultrapassa_ultimo_valor(self):
        """retry_count acima do maximo usa o ultimo valor de backoff."""
        result_max = _compute_next_retry_at(MAX_RETRIES)
        result_beyond = _compute_next_retry_at(MAX_RETRIES + 5)
        diff = abs((result_max - result_beyond).total_seconds())
        assert diff < 2


# ── Testes de logica de _process_retry_batch ───────────────────────────────────

class TestProcessRetryBatch:
    @patch("services.webhook_retry_worker.get_setting")
    @patch("services.webhook_retry_worker.SessionLocal")
    @patch("services.webhook_retry_worker.httpx.Client")
    def test_reenvio_com_sucesso_muda_status_para_success(self, mock_httpx, mock_session, mock_get_setting):
        """Mensagem com status=failed e retry_count=0 → reenviada com 200 → status=success."""
        from services.webhook_retry_worker import _process_retry_batch

        msg = _make_msg(status="failed", retry_count=0)
        convo = _make_convo()

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [msg]
        db.query.return_value.filter.return_value.first.return_value = convo
        mock_session.return_value = db
        mock_get_setting.return_value = "https://agentflow.example.com/webhook"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_httpx.return_value.__enter__.return_value.post.return_value = mock_response

        _process_retry_batch()

        assert msg.agentflow_webhook_status == "success"
        assert msg.agentflow_webhook_error is None
        assert msg.agentflow_retry_count == 1

    @patch("services.webhook_retry_worker.get_setting")
    @patch("services.webhook_retry_worker.SessionLocal")
    @patch("services.webhook_retry_worker.httpx.Client")
    def test_falha_incrementa_retry_count_e_agenda_proximo(self, mock_httpx, mock_session, mock_get_setting):
        """Mensagem com status=failed e retry_count=0 → timeout → retry_count=1, retry_at definido."""
        from services.webhook_retry_worker import _process_retry_batch

        msg = _make_msg(status="failed", retry_count=0)
        convo = _make_convo()

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [msg]
        db.query.return_value.filter.return_value.first.return_value = convo
        mock_session.return_value = db
        mock_get_setting.return_value = "https://agentflow.example.com/webhook"

        mock_httpx.return_value.__enter__.return_value.post.side_effect = Exception("timeout")

        _process_retry_batch()

        assert msg.agentflow_webhook_status == "failed"
        assert msg.agentflow_retry_count == 1
        assert msg.agentflow_retry_at is not None

    @patch("services.webhook_retry_worker.get_setting")
    @patch("services.webhook_retry_worker.SessionLocal")
    @patch("services.webhook_retry_worker.httpx.Client")
    def test_esgotamento_muda_status_para_retry_exhausted(self, mock_httpx, mock_session, mock_get_setting):
        """Mensagem com retry_count=2 que falha novamente → status=retry_exhausted."""
        from services.webhook_retry_worker import _process_retry_batch

        msg = _make_msg(status="failed", retry_count=2)
        convo = _make_convo()

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [msg]
        db.query.return_value.filter.return_value.first.return_value = convo
        mock_session.return_value = db
        mock_get_setting.return_value = "https://agentflow.example.com/webhook"

        mock_httpx.return_value.__enter__.return_value.post.side_effect = Exception("conexao recusada")

        _process_retry_batch()

        assert msg.agentflow_webhook_status == "retry_exhausted"
        assert msg.agentflow_retry_count == MAX_RETRIES

    @patch("services.webhook_retry_worker.SessionLocal")
    def test_sem_candidatos_nao_executa_nada(self, mock_session):
        """Sem mensagens falhas, o worker nao tenta nenhum reenvio."""
        from services.webhook_retry_worker import _process_retry_batch

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        mock_session.return_value = db

        _process_retry_batch()

        # Nenhum commit foi feito
        db.commit.assert_not_called()

    @patch("services.webhook_retry_worker.get_setting")
    @patch("services.webhook_retry_worker.SessionLocal")
    def test_sem_url_configurada_marca_retry_exhausted(self, mock_session, mock_get_setting):
        """Cliente sem URL de webhook configurada → mensagem marcada como retry_exhausted imediatamente."""
        from services.webhook_retry_worker import _process_retry_batch

        msg = _make_msg(status="failed", retry_count=0)
        convo = _make_convo()

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [msg]
        db.query.return_value.filter.return_value.first.return_value = convo
        mock_session.return_value = db
        mock_get_setting.return_value = ""  # URL vazia = nao configurada

        _process_retry_batch()

        assert msg.agentflow_webhook_status == "retry_exhausted"

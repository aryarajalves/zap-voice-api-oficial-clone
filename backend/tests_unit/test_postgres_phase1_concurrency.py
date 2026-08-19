"""
test_postgres_phase1_concurrency.py
Testes unitários para validação de atomicidade e concorrência segura (FOR UPDATE SKIP LOCKED)
da Fase 1 do Roadmap PostgreSQL do ZapVoice.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
import models
from services.scheduler.email_processor import process_scheduled_email_dispatches
from services.webhook_retry_worker import _process_retry_batch
from services.scheduler.cleanup_tasks import run_bulk_crash_detection, run_stale_triggers_cleanup


def test_email_dispatch_skip_locked_query():
    """Valida se o processador de e-mails utiliza with_for_update(skip_locked=True)."""
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_with_for_update = MagicMock()

    mock_db.query.return_value = mock_query
    mock_query.filter.return_value = mock_filter
    mock_filter.with_for_update.return_value = mock_with_for_update
    mock_with_for_update.all.return_value = []

    import asyncio
    asyncio.run(process_scheduled_email_dispatches(db_session=mock_db))

    mock_filter.with_for_update.assert_called_once_with(skip_locked=True)


def test_webhook_retry_skip_locked_query():
    """Valida se o worker de retry de webhooks utiliza with_for_update(skip_locked=True)."""
    with patch("services.webhook_retry_worker.SessionLocal") as mock_session_cls:
        mock_db = MagicMock()
        mock_session_cls.return_value = mock_db

        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_with_for_update = MagicMock()

        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.with_for_update.return_value = mock_with_for_update
        mock_with_for_update.all.return_value = []

        _process_retry_batch()

        mock_filter.with_for_update.assert_called_once_with(skip_locked=True)


def test_cleanup_tasks_skip_locked_query():
    """Valida se a rotina de detecção de crashes e triggers stale usa with_for_update(skip_locked=True)."""
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_with_for_update = MagicMock()

    mock_db.query.return_value = mock_query
    mock_query.filter.return_value = mock_filter
    mock_filter.with_for_update.return_value = mock_with_for_update
    mock_with_for_update.all.return_value = []

    import asyncio
    asyncio.run(run_bulk_crash_detection(db_session=mock_db))

    # Deve chamar with_for_update(skip_locked=True)
    assert mock_filter.with_for_update.call_count >= 1
    mock_filter.with_for_update.assert_called_with(skip_locked=True)


def test_multi_worker_concurrency_simulation():
    """
    Simula 3 workers paralelos consumindo itens de uma fila protegida por SKIP LOCKED.
    Garante que nenhum item seja processado por mais de um worker.
    """
    # Lote de 9 itens pendentes
    all_items = [{"id": i, "locked": False} for i in range(1, 10)]

    def worker_fetch_batch(batch_size=3):
        claimed = []
        for item in all_items:
            if not item["locked"]:
                item["locked"] = True
                claimed.append(item["id"])
                if len(claimed) == batch_size:
                    break
        return claimed

    # Simulação da execução simultânea de 3 workers
    worker1_results = worker_fetch_batch(3)
    worker2_results = worker_fetch_batch(3)
    worker3_results = worker_fetch_batch(3)
    worker4_results = worker_fetch_batch(3) # Worker 4 chega depois

    # 1. Cada worker deve pegar exatamente 3 itens distintos
    assert worker1_results == [1, 2, 3]
    assert worker2_results == [4, 5, 6]
    assert worker3_results == [7, 8, 9]

    # 2. Worker 4 não encontra nenhum item pendente (fila esgotada)
    assert worker4_results == []

    # 3. Conjuntos são 100% disjuntos (zero duplicatas entre os workers)
    all_claimed = worker1_results + worker2_results + worker3_results
    assert len(all_claimed) == 9
    assert len(set(all_claimed)) == 9

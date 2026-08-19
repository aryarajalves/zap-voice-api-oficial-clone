import os
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from services.scheduler.cleanup_tasks import (
    run_waba_payment_checks_purge,
    run_webhook_events_purge,
    run_old_message_status_purge,
    run_all_database_purges,
)
from scripts.purge_old_database_records import run_purge_sync


@pytest.mark.asyncio
async def test_run_waba_payment_checks_purge():
    """Valida se a rotina de expurgo de verificações de pagamento WABA executa com sucesso."""
    mock_db = MagicMock()
    # Simula 5 IDs encontrados para expurgo
    mock_db.query.return_value.filter.return_value.limit.return_value.all.side_effect = [
        [(1,), (2,), (3,)],
        []
    ]
    mock_db.query.return_value.filter.return_value.delete.return_value = 3

    await run_waba_payment_checks_purge(db_session=mock_db)
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_run_webhook_events_purge():
    """Valida se a rotina de expurgo de eventos de webhook executa com sucesso."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.limit.return_value.all.side_effect = [
        [(10,), (11,)],
        []
    ]
    mock_db.query.return_value.filter.return_value.delete.return_value = 2

    await run_webhook_events_purge(db_session=mock_db)
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_run_old_message_status_purge():
    """Valida se a rotina de expurgo de status antigos executa com sucesso."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.limit.return_value.all.side_effect = [
        [(101,), (102,)],
        []
    ]
    mock_db.query.return_value.filter.return_value.delete.return_value = 2

    await run_old_message_status_purge(db_session=mock_db)
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_run_all_database_purges():
    """Valida se a função consolidada run_all_database_purges roda todas as etapas."""
    mock_db = MagicMock()
    with patch("services.scheduler.cleanup_tasks.run_history_cleanup") as mock_hist, \
         patch("services.scheduler.cleanup_tasks.run_waba_payment_checks_purge") as mock_waba, \
         patch("services.scheduler.cleanup_tasks.run_webhook_events_purge") as mock_wh, \
         patch("services.scheduler.cleanup_tasks.run_old_message_status_purge") as mock_ms:
        
        await run_all_database_purges(db_session=mock_db)
        mock_hist.assert_called_once()
        mock_waba.assert_called_once_with(mock_db)
        mock_wh.assert_called_once_with(mock_db)
        mock_ms.assert_called_once_with(mock_db)


def test_run_purge_sync_script():
    """Valida o runner síncrono do script de purge."""
    with patch("scripts.purge_old_database_records.create_engine") as mock_engine, \
         patch("scripts.purge_old_database_records.sessionmaker") as mock_sm:
        mock_session = MagicMock()
        mock_session.query.return_value.filter.return_value.delete.return_value = 10
        mock_sm.return_value.return_value = mock_session

        code = run_purge_sync()
        assert code == 0

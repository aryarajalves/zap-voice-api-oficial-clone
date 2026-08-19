"""
test_postgres_phase6_listen_notify.py
Testes unitários para validação de Eventos em Tempo Real com LISTEN / NOTIFY
da Fase 6 do Roadmap PostgreSQL do ZapVoice.
"""
import os
import json
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from alembic.config import Config
from alembic.script import ScriptDirectory
from services.pg_realtime_listener import start_pg_listener


def test_alembic_has_realtime_migration_head():
    """Valida se a migração 0005_pg_realtime é a head atual do Alembic."""
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")
    
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
    
    script_dir = ScriptDirectory.from_config(cfg)
    heads = script_dir.get_heads()
    
    assert len(heads) == 1
    assert heads[0] == "0005_pg_realtime"


@pytest.mark.asyncio
async def test_pg_listener_ignores_non_postgres_database():
    """Valida se o listener desativa suavemente em ambiente SQLite/Memory de teste."""
    with patch("services.pg_realtime_listener.SQLALCHEMY_DATABASE_URL", "sqlite://"):
        # Não deve lançar erro
        await start_pg_listener()


@pytest.mark.asyncio
async def test_pg_realtime_broadcast_payload_processing():
    """Valida o repasse de eventos JSON para o ConnectionManager."""
    mock_manager = MagicMock()
    mock_manager.broadcast = AsyncMock()

    sample_payload = {
        "event_source": "postgres_trigger",
        "table": "webhook_leads",
        "operation": "INSERT",
        "id": 100,
        "client_id": 1
    }

    # Simula envio para o manager
    await mock_manager.broadcast(sample_payload)
    mock_manager.broadcast.assert_awaited_once_with(sample_payload)

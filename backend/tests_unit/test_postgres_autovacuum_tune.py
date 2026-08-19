import os
import pytest
from unittest.mock import patch, MagicMock

try:
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    ALEMBIC_AVAILABLE = True
except ImportError:
    ALEMBIC_AVAILABLE = False

from scripts.tune_autovacuum_settings import apply_autovacuum_tuning, TARGET_TABLES


def test_alembic_0009_migration_present():
    """Valida se a migração 0009 de autovacuum tuning está configurada no Alembic."""
    if not ALEMBIC_AVAILABLE:
        pytest.skip("Alembic não instalado no container")

    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")

    if os.path.exists(ini_path):
        cfg = Config(ini_path)
        cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
        script_dir = ScriptDirectory.from_config(cfg)
        revisions = [rev.revision for rev in script_dir.walk_revisions()]
        assert "0009_tune_autovacuum" in revisions


def test_autovacuum_target_tables():
    """Valida a lista de tabelas alvo de autovacuum agressivo."""
    assert len(TARGET_TABLES) == 6
    assert "message_status" in TARGET_TABLES
    assert "webhook_events" in TARGET_TABLES
    assert "chat_messages" in TARGET_TABLES
    assert "scheduled_triggers" in TARGET_TABLES
    assert "contact_windows" in TARGET_TABLES
    assert "waba_payment_checks" in TARGET_TABLES


def test_apply_autovacuum_tuning_script_runs():
    """Valida a execução do script tune_autovacuum_settings."""
    with patch("scripts.tune_autovacuum_settings.create_engine") as mock_create_engine:
        mock_conn = MagicMock()
        mock_conn.execute.return_value.scalar.return_value = True
        mock_create_engine.return_value.begin.return_value.__enter__.return_value = mock_conn

        code = apply_autovacuum_tuning()
        assert code == 0

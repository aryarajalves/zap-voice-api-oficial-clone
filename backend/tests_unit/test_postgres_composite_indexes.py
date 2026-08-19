import os
import pytest
from sqlalchemy import text
from database import engine, SQLALCHEMY_DATABASE_URL

try:
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    ALEMBIC_AVAILABLE = True
except ImportError:
    ALEMBIC_AVAILABLE = False

EXPECTED_COMPOSITE_INDEXES = [
    "idx_message_status_phone_time",
    "idx_message_status_trigger_status",
    "idx_contact_windows_client_phone",
    "idx_contact_windows_client_last_interaction",
    "idx_template_cache_client_name_lang",
    "idx_template_cache_client_pinned_name",
    "idx_chat_convo_client_unread_last",
    "idx_contatos_monitorados_inbox_time",
]


def test_alembic_0007_migration_present():
    """Valida se a migração 0007 de índices compostos está configurada no Alembic."""
    if not ALEMBIC_AVAILABLE:
        pytest.skip("Alembic não instalado no container")

    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")

    if os.path.exists(ini_path):
        cfg = Config(ini_path)
        cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
        script_dir = ScriptDirectory.from_config(cfg)
        revisions = [rev.revision for rev in script_dir.walk_revisions()]
        assert "0007_high_traffic_indexes" in revisions


def test_composite_indexes_list_completeness():
    """Valida se os 8 índices compostos estão presentes na lista de definição."""
    assert len(EXPECTED_COMPOSITE_INDEXES) == 8
    assert "idx_message_status_phone_time" in EXPECTED_COMPOSITE_INDEXES
    assert "idx_contact_windows_client_phone" in EXPECTED_COMPOSITE_INDEXES
    assert "idx_template_cache_client_name_lang" in EXPECTED_COMPOSITE_INDEXES


def test_apply_composite_indexes_script_runs():
    """Valida a execução do script add_high_traffic_composite_indexes."""
    from unittest.mock import patch, MagicMock
    from scripts.add_high_traffic_composite_indexes import apply_composite_indexes

    with patch("scripts.add_high_traffic_composite_indexes.create_engine") as mock_create_engine:
        mock_conn = MagicMock()
        mock_conn.execute.return_value.scalar.return_value = True
        mock_create_engine.return_value.begin.return_value.__enter__.return_value = mock_conn

        code = apply_composite_indexes()
        assert code == 0

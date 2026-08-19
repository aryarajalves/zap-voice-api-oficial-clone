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

COLUMNS_TO_JSONB = [
    ("chat_conversations", "labels"),
    ("chat_messages", "meta_data"),
    ("email_dispatches", "contacts_list"),
    ("funnels", "allowed_phones"),
    ("funnels", "blocked_phones"),
    ("funnels", "business_hours_days"),
    ("funnels", "steps"),
    ("product_status", "last_payload"),
    ("recurring_triggers", "direct_message_params"),
    ("scheduled_triggers", "contacts_list"),
    ("scheduled_triggers", "direct_message_params"),
    ("scheduled_triggers", "pending_contacts"),
    ("scheduled_triggers", "processed_contacts"),
    ("scheduled_triggers", "template_components"),
    ("webhook_configs", "field_mapping"),
    ("webhook_configs", "last_payload"),
    ("webhook_event_mappings", "template_components"),
    ("webhook_event_mappings", "variables_mapping"),
    ("webhook_events", "headers"),
    ("webhook_events", "payload"),
    ("webhook_events", "processed_data"),
    ("webhook_history", "payload"),
    ("webhook_history", "processed_data"),
    ("whatsapp_template_cache", "components"),
]


def test_alembic_0008_migration_present():
    """Valida se a migração 0008 de conversão JSONB está configurada no Alembic."""
    if not ALEMBIC_AVAILABLE:
        pytest.skip("Alembic não instalado no container")

    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")

    if os.path.exists(ini_path):
        cfg = Config(ini_path)
        cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
        script_dir = ScriptDirectory.from_config(cfg)
        revisions = [rev.revision for rev in script_dir.walk_revisions()]
        assert "0008_migrate_jsonb" in revisions


def test_jsonb_columns_list_completeness():
    """Valida se todas as 24 colunas de 12 tabelas estão mapeadas."""
    assert len(COLUMNS_TO_JSONB) == 24
    tables = {item[0] for item in COLUMNS_TO_JSONB}
    assert "chat_conversations" in tables
    assert "chat_messages" in tables
    assert "scheduled_triggers" in tables
    assert "webhook_history" in tables


def test_apply_jsonb_migration_script_runs():
    """Valida a execução do script migrate_json_to_jsonb."""
    from unittest.mock import patch, MagicMock
    from scripts.migrate_json_to_jsonb import apply_jsonb_migration

    with patch("scripts.migrate_json_to_jsonb.create_engine") as mock_create_engine:
        mock_conn = MagicMock()
        mock_conn.execute.return_value.scalar.return_value = "jsonb"
        mock_create_engine.return_value.begin.return_value.__enter__.return_value = mock_conn

        code = apply_jsonb_migration()
        assert code == 0

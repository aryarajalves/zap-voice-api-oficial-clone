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

EXPECTED_FK_INDEXES = [
    ("idx_fk_users_client_id", "users", "client_id"),
    ("idx_fk_scheduled_triggers_funnel_id", "scheduled_triggers", "funnel_id"),
    ("idx_fk_recurring_triggers_funnel_id", "recurring_triggers", "funnel_id"),
    ("idx_fk_chat_messages_user_id", "chat_messages", "user_id"),
    ("idx_fk_api_keys_user_id", "api_keys", "user_id"),
    ("idx_fk_user_clients_client_id", "user_clients", "client_id"),
    ("idx_fk_invitation_clients_client_id", "invitation_clients", "client_id"),
    ("idx_fk_user_invitations_created_by_id", "user_invitations", "created_by_id"),
    ("idx_fk_webhook_configs_funnel_id", "webhook_configs", "funnel_id"),
    ("idx_fk_webhook_event_mappings_funnel_id", "webhook_event_mappings", "funnel_id"),
    ("idx_fk_webhook_leads_imported_by", "webhook_leads", "imported_by_client_id"),
    ("idx_fk_instagram_automations_funnel_id", "instagram_automations", "funnel_id"),
    ("idx_fk_contact_import_history_project_id", "contact_import_history", "project_id"),
    ("idx_fk_clients_project_id", "clients", "project_id"),
    ("idx_fk_email_dispatches_template_id", "email_dispatches", "template_id"),
    ("idx_fk_email_inbounds_dispatch_id", "email_inbounds", "dispatch_id"),
    ("idx_fk_email_inbounds_lead_id", "email_inbounds", "lead_id"),
    ("idx_fk_contact_template_history_trigger_id", "contact_template_history", "trigger_id"),
]


def test_alembic_0006_migration_present():
    """Valida se a migração 0006 de índices de Foreign Keys está configurada no Alembic."""
    if not ALEMBIC_AVAILABLE:
        pytest.skip("Alembic não instalado no container")

    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")

    if os.path.exists(ini_path):
        cfg = Config(ini_path)
        cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
        script_dir = ScriptDirectory.from_config(cfg)
        revisions = [rev.revision for rev in script_dir.walk_revisions()]
        assert "0006_add_missing_fk_indexes" in revisions


def test_fk_indexes_list_completeness():
    """Valida se a lista de 18 FK indexes cobre todos os relacionamentos sem índice."""
    assert len(EXPECTED_FK_INDEXES) == 18
    index_names = [item[0] for item in EXPECTED_FK_INDEXES]
    assert "idx_fk_users_client_id" in index_names
    assert "idx_fk_scheduled_triggers_funnel_id" in index_names
    assert "idx_fk_chat_messages_user_id" in index_names


def test_apply_fk_indexes_script_runs():
    """Valida a execução do script add_missing_fk_indexes."""
    from unittest.mock import patch, MagicMock
    from scripts.add_missing_fk_indexes import apply_fk_indexes

    with patch("scripts.add_missing_fk_indexes.create_engine") as mock_create_engine:
        mock_conn = MagicMock()
        mock_conn.execute.return_value.scalar.return_value = True
        mock_create_engine.return_value.begin.return_value.__enter__.return_value = mock_conn

        code = apply_fk_indexes()
        assert code == 0

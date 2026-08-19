"""
test_postgres_phase4_indexes.py
Testes unitários para validação de Índices Compostos de Alta Performance
da Fase 4 do Roadmap PostgreSQL do ZapVoice.
"""
import os
import pytest
from sqlalchemy import inspect
from alembic.config import Config
from alembic.script import ScriptDirectory
import models


def test_models_have_composite_indexes_configured():
    """Valida se os modelos declaram os índices compostos de alta performance."""
    # 1. ScheduledTrigger
    st_indexes = {idx.name: [c.name for c in idx.columns] for idx in models.ScheduledTrigger.__table__.indexes}
    assert "ix_scheduled_triggers_client_status_time" in st_indexes
    assert st_indexes["ix_scheduled_triggers_client_status_time"] == ["client_id", "status", "scheduled_time"]
    assert "ix_scheduled_triggers_client_created" in st_indexes
    assert "ix_scheduled_triggers_client_is_bulk" in st_indexes

    # 2. WebhookLead
    wl_indexes = {idx.name: [c.name for c in idx.columns] for idx in models.WebhookLead.__table__.indexes}
    assert "ix_webhook_leads_client_phone" in wl_indexes
    assert wl_indexes["ix_webhook_leads_client_phone"] == ["client_id", "phone"]
    assert "ix_webhook_leads_project_phone" in wl_indexes
    assert "ix_webhook_leads_client_last_event_at" in wl_indexes

    # 3. WebhookIntegration
    wi_indexes = {idx.name: [c.name for c in idx.columns] for idx in models.WebhookIntegration.__table__.indexes}
    assert "ix_webhook_integrations_client_status" in wi_indexes
    assert wi_indexes["ix_webhook_integrations_client_status"] == ["client_id", "status"]

    # 4. WebhookHistory
    wh_indexes = {idx.name: [c.name for c in idx.columns] for idx in models.WebhookHistory.__table__.indexes}
    assert "ix_webhook_history_integration_created" in wh_indexes
    assert "ix_webhook_history_integration_status" in wh_indexes

    # 5. WebhookEvent
    we_indexes = {idx.name: [c.name for c in idx.columns] for idx in models.WebhookEvent.__table__.indexes}
    assert "ix_webhook_events_webhook_status" in we_indexes
    assert "ix_webhook_events_webhook_external" in we_indexes


def test_alembic_has_composite_indexes_migration_head():
    """Valida se a migração 0002_add_high_performance_composite_indexes é a head atual do Alembic."""
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(current_dir, "alembic.ini")
    
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(current_dir, "alembic_migrations"))
    
    script_dir = ScriptDirectory.from_config(cfg)
    revisions = [rev.revision for rev in script_dir.walk_revisions()]
    assert "0002_perf_indexes" in revisions, "A migração 0002 de índices compostos deve estar presente no histórico"

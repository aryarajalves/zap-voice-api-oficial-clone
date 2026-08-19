"""
add_composite_performance_indexes.py
Script de migração para criar índices compostos de alta performance (Fase 4 do Roadmap PostgreSQL)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL
from core.logger import setup_logger

logger = setup_logger("Migration.Indexes")

def run_migration():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("❌ DATABASE_URL não configurada.")
        return

    logger.info("🚀 Criando índices compostos de alta performance no PostgreSQL...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    indexes = [
        # scheduled_triggers
        ("ix_scheduled_triggers_client_status_time", "CREATE INDEX IF NOT EXISTS ix_scheduled_triggers_client_status_time ON scheduled_triggers (client_id, status, scheduled_time);"),
        ("ix_scheduled_triggers_client_created", "CREATE INDEX IF NOT EXISTS ix_scheduled_triggers_client_created ON scheduled_triggers (client_id, created_at);"),
        ("ix_scheduled_triggers_client_is_bulk", "CREATE INDEX IF NOT EXISTS ix_scheduled_triggers_client_is_bulk ON scheduled_triggers (client_id, is_bulk);"),

        # webhook_leads
        ("ix_webhook_leads_client_phone", "CREATE INDEX IF NOT EXISTS ix_webhook_leads_client_phone ON webhook_leads (client_id, phone);"),
        ("ix_webhook_leads_project_phone", "CREATE INDEX IF NOT EXISTS ix_webhook_leads_project_phone ON webhook_leads (project_id, phone);"),
        ("ix_webhook_leads_client_last_event_at", "CREATE INDEX IF NOT EXISTS ix_webhook_leads_client_last_event_at ON webhook_leads (client_id, last_event_at);"),

        # webhook_integrations
        ("ix_webhook_integrations_client_status", "CREATE INDEX IF NOT EXISTS ix_webhook_integrations_client_status ON webhook_integrations (client_id, status);"),

        # webhook_history
        ("ix_webhook_history_integration_created", "CREATE INDEX IF NOT EXISTS ix_webhook_history_integration_created ON webhook_history (integration_id, created_at);"),
        ("ix_webhook_history_integration_status", "CREATE INDEX IF NOT EXISTS ix_webhook_history_integration_status ON webhook_history (integration_id, status);"),

        # webhook_events
        ("ix_webhook_events_webhook_status", "CREATE INDEX IF NOT EXISTS ix_webhook_events_webhook_status ON webhook_events (webhook_id, status);"),
        ("ix_webhook_events_webhook_external", "CREATE INDEX IF NOT EXISTS ix_webhook_events_webhook_external ON webhook_events (webhook_id, external_id);")
    ]

    with engine.connect() as conn:
        for idx_name, idx_sql in indexes:
            try:
                conn.execute(text(idx_sql))
                logger.info(f"✅ Índice {idx_name} verificado/criado.")
            except Exception as e_idx:
                logger.warning(f"⚠️ Aviso ao criar {idx_name}: {e_idx}")
        conn.commit()

    logger.info("✨ Todos os índices compostos de alta performance foram aplicados com sucesso!")

if __name__ == "__main__":
    run_migration()

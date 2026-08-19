"""
add_metadata_jsonb_to_leads.py
Script de migração para adicionar a coluna 'metadata' (JSONB) e criar índices GIN
na tabela 'webhook_leads' do PostgreSQL.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL
from core.logger import setup_logger

logger = setup_logger("Migration.JSONB")

def run_migration():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("❌ DATABASE_URL não configurada.")
        return

    logger.info("🚀 Iniciando migração para adicionar coluna metadata (JSONB) e índices GIN...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"📊 Dialeto detectado: {dialect}")

        if dialect == "postgresql":
            # 1. Adiciona coluna metadata como JSONB
            sql_col = 'ALTER TABLE webhook_leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'::jsonb;'
            logger.info(f"Executando: {sql_col}")
            conn.execute(text(sql_col))

            # 2. Cria índices GIN para busca instantânea
            indexes = [
                ("idx_leads_metadata_gin", "CREATE INDEX IF NOT EXISTS idx_leads_metadata_gin ON webhook_leads USING gin (metadata);"),
                ("idx_leads_variables_gin", "CREATE INDEX IF NOT EXISTS idx_leads_variables_gin ON webhook_leads USING gin (variables);"),
                ("idx_webhook_history_payload_gin", "CREATE INDEX IF NOT EXISTS idx_webhook_history_payload_gin ON webhook_history USING gin (payload);"),
                ("idx_webhook_history_processed_data_gin", "CREATE INDEX IF NOT EXISTS idx_webhook_history_processed_data_gin ON webhook_history USING gin (processed_data);"),
                ("idx_scheduled_triggers_processed_data_gin", "CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_processed_data_gin ON scheduled_triggers USING gin (processed_data);")
            ]

            for idx_name, idx_sql in indexes:
                try:
                    logger.info(f"Criando índice {idx_name}...")
                    conn.execute(text(idx_sql))
                    logger.info(f"✅ Índice {idx_name} criado/verificado.")
                except Exception as e_idx:
                    logger.warning(f"⚠️ Aviso ao criar {idx_name}: {e_idx}")

            conn.commit()
            logger.info("✨ Migração PostgreSQL concluída com sucesso!")
        else:
            # SQLite fallback
            try:
                conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN metadata JSON;"))
                conn.commit()
                logger.info("✅ Coluna metadata adicionada (SQLite).")
            except Exception as e_sql:
                if "duplicate column" in str(e_sql).lower():
                    logger.info("ℹ️ Coluna metadata já existe no SQLite.")
                else:
                    logger.warning(f"⚠️ SQLite aviso: {e_sql}")

if __name__ == "__main__":
    run_migration()

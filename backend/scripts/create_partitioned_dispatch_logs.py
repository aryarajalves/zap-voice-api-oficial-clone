"""
create_partitioned_dispatch_logs.py
Script de migração para criar a tabela particionada dispatch_logs (Fase 4 do Roadmap PostgreSQL)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL
from core.logger import setup_logger

logger = setup_logger("Migration.Partitions")

def run_migration():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("❌ DATABASE_URL não configurada.")
        return

    logger.info("🚀 Criando tabela particionada dispatch_logs no PostgreSQL...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            # 1. Tabela mestre particionada
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_logs (
                id BIGSERIAL,
                client_id INTEGER NOT NULL,
                trigger_id INTEGER,
                channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp_official',
                recipient VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'sent',
                response_payload JSONB DEFAULT '{}'::jsonb,
                error_message TEXT,
                cost FLOAT DEFAULT 0.0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                PRIMARY KEY (id, created_at)
            ) PARTITION BY RANGE (created_at);
            """))

            # 2. Partições mensais
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_logs_2026_08 PARTITION OF dispatch_logs
            FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
            """))

            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_logs_2026_09 PARTITION OF dispatch_logs
            FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
            """))

            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_logs_2026_10 PARTITION OF dispatch_logs
            FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
            """))

            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_logs_default PARTITION OF dispatch_logs DEFAULT;
            """))

            # 3. Índices
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_dispatch_logs_client_created ON dispatch_logs (client_id, created_at);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_dispatch_logs_status_created ON dispatch_logs (status, created_at);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_dispatch_logs_trigger_created ON dispatch_logs (trigger_id, created_at);"))

            conn.commit()
            logger.info("✨ Tabela particionada dispatch_logs e partições mensais criadas com sucesso!")
        else:
            # Fallback para SQLite
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                trigger_id INTEGER,
                channel VARCHAR(50) NOT NULL,
                recipient VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL,
                response_payload JSON,
                error_message TEXT,
                cost FLOAT DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """))
            conn.commit()
            logger.info("✅ Tabela dispatch_logs criada (modo SQLite).")

if __name__ == "__main__":
    run_migration()

"""
Migração: Criação da tabela backup_config

Esta tabela armazena as configurações de agendamento e retenção
dos backups automáticos do banco de dados.

Execute com:
    python backend/migrations/add_backup_config_table.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import text
from database import engine
from core.logger import logger


def run_migration():
    logger.info("🔧 [MIGRATION] Criando tabela backup_config...")

    with engine.connect() as conn:
        # Verifica se a tabela já existe
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backup_config')"
        ))
        exists = result.scalar()

        if exists:
            logger.info("✅ [MIGRATION] Tabela backup_config já existe. Pulando.")
            return

        conn.execute(text("""
            CREATE TABLE backup_config (
                id SERIAL PRIMARY KEY,
                enabled BOOLEAN NOT NULL DEFAULT FALSE,
                interval_type VARCHAR(20) NOT NULL DEFAULT 'manual',
                interval_value INTEGER NOT NULL DEFAULT 24,
                retention_count INTEGER NOT NULL DEFAULT 30,
                last_backup_at TIMESTAMPTZ,
                next_backup_at TIMESTAMPTZ,
                last_backup_filename TEXT,
                last_backup_status VARCHAR(50),
                last_backup_error TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.commit()
        logger.info("✅ [MIGRATION] Tabela backup_config criada com sucesso!")


if __name__ == "__main__":
    run_migration()

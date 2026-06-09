"""
Migração: Criação da tabela hot_leads

Esta tabela armazena os leads quentes gerados nos fluxos de automação,
associando-os aos vendedores de forma inteligente.

Execute com:
    python backend/migrations/create_hot_leads_table.py
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
    logger.info("🔧 [MIGRATION] Criando tabela hot_leads...")

    with engine.connect() as conn:
        # Verifica se a tabela já existe
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'hot_leads')"
        ))
        exists = result.scalar()

        if exists:
            logger.info("✅ [MIGRATION] Tabela hot_leads já existe. Pulando.")
            return

        conn.execute(text("""
            CREATE TABLE hot_leads (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                contact_name VARCHAR(255),
                contact_phone VARCHAR(50) NOT NULL,
                alert_name VARCHAR(255) NOT NULL,
                priority VARCHAR(50) NOT NULL DEFAULT 'Média',
                context_message TEXT,
                assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX idx_hot_leads_client_id ON hot_leads(client_id);
            CREATE INDEX idx_hot_leads_contact_phone ON hot_leads(contact_phone);
            CREATE INDEX idx_hot_leads_alert_name ON hot_leads(alert_name);
            CREATE INDEX idx_hot_leads_assigned_user_id ON hot_leads(assigned_user_id);
        """))
        conn.commit()
        logger.info("✅ [MIGRATION] Tabela hot_leads criada com sucesso!")


if __name__ == "__main__":
    run_migration()

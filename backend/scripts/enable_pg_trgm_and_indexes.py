"""
enable_pg_trgm_and_indexes.py
Script para habilitar a extensão pg_trgm e criar índices Trigram GIN (Fase 5 do Roadmap PostgreSQL)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL
from core.logger import setup_logger

logger = setup_logger("Migration.Trigram")

def run_migration():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("❌ DATABASE_URL não configurada.")
        return

    logger.info("🚀 Configurando extensão pg_trgm e índices Trigram GIN...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            # 1. Habilitar extensão pg_trgm
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))

            # 2. Índices Trigram GIN em webhook_leads
            conn.execute(text("CREATE INDEX IF NOT EXISTS trgm_idx_leads_name ON webhook_leads USING gin (name gin_trgm_ops);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS trgm_idx_leads_phone ON webhook_leads USING gin (phone gin_trgm_ops);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS trgm_idx_leads_email ON webhook_leads USING gin (email gin_trgm_ops);"))

            # 3. Índices Trigram GIN em chat_messages
            conn.execute(text("CREATE INDEX IF NOT EXISTS trgm_idx_chat_messages_content ON chat_messages USING gin (content gin_trgm_ops);"))

            # 4. Índices Trigram GIN em chat_conversations
            conn.execute(text("CREATE INDEX IF NOT EXISTS trgm_idx_chat_conversations_name ON chat_conversations USING gin (contact_name gin_trgm_ops);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS trgm_idx_chat_conversations_phone ON chat_conversations USING gin (phone gin_trgm_ops);"))

            conn.commit()
            logger.info("✨ Extensão pg_trgm e índices Trigram GIN configurados com sucesso no PostgreSQL!")
        else:
            logger.info("ℹ️ Dialeto SQLite detectado. pg_trgm ignorado (apenas para PostgreSQL).")

if __name__ == "__main__":
    run_migration()

import os
import sys

# Adicionar diretório raiz ao path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from database import engine
from core.logger import setup_logger

logger = setup_logger("migration_password_reset_tokens")

def migrate():
    """
    Cria a tabela password_reset_tokens para geração de links de redefinição de senha para usuários existentes.
    """
    logger.info("🚀 Iniciando migração: criação da tabela password_reset_tokens...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE,
                is_used BOOLEAN DEFAULT FALSE NOT NULL
            );
        """))
        
        # Índices para busca rápida
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
            ON password_reset_tokens (token);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
            ON password_reset_tokens (user_id);
        """))
        
    logger.info("✅ Migração concluída com sucesso: tabela password_reset_tokens criada.")

if __name__ == "__main__":
    migrate()

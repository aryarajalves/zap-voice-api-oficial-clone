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

logger = setup_logger("migration_verification_codes")

def migrate():
    """
    Cria a tabela email_verification_codes para validação de cadastro por e-mail via Brevo.
    """
    logger.info("🚀 Iniciando migração: criação da tabela email_verification_codes...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_verification_codes (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(10) NOT NULL,
                token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_used BOOLEAN DEFAULT FALSE NOT NULL,
                attempts INTEGER DEFAULT 0 NOT NULL
            );
        """))
        
        # Índices para busca rápida
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email 
            ON email_verification_codes (email);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_email_verification_codes_token 
            ON email_verification_codes (token);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_email_verification_codes_code 
            ON email_verification_codes (code);
        """))
        
    logger.info("✅ Migração concluída com sucesso: tabela email_verification_codes criada.")

if __name__ == "__main__":
    migrate()

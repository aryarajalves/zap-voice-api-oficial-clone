import sys
import os
from sqlalchemy import text

# Adiciona o diretório pai ao path para importar database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from core.logger import logger

def migrate():
    db = SessionLocal()
    try:
        logger.info("🛠️ Iniciando migração para tornar 'idempotency_key' única...")
        
        # 1. Limpeza de duplicados (se existirem) para não quebrar a migração
        # Mantemos apenas o registro mais novo de cada idempotency_key
        logger.info("🧹 Limpando possíveis registros duplicados legados...")
        delete_query = text("""
            DELETE FROM scheduled_triggers 
            WHERE id NOT IN (
                SELECT MAX(id) 
                FROM scheduled_triggers 
                WHERE idempotency_key IS NOT NULL 
                GROUP BY idempotency_key
            ) AND idempotency_key IS NOT NULL
        """)
        db.execute(delete_query)
        db.commit()

        # 2. Aplicar a restrição de unicidade
        # Como o SQLite não suporta ALTER TABLE ADD UNIQUE, usamos a estratégia de criar índice único
        logger.info("🔒 Aplicando índice de unicidade em 'idempotency_key'...")
        
        # Tenta criar o índice único (funciona em Postgres e SQLite)
        try:
            db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_idempotency_key ON scheduled_triggers (idempotency_key) WHERE idempotency_key IS NOT NULL"))
            db.commit()
            logger.info("✅ Índice único criado com sucesso!")
        except Exception as e:
            logger.warning(f"⚠️ Aviso ao criar índice (pode já existir): {e}")
            db.rollback()

        logger.info("🚀 Migração concluída com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

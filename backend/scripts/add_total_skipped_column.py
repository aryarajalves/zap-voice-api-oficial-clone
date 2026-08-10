"""
Script de migração: adiciona coluna total_skipped na tabela scheduled_triggers.

Execute com:
    python backend/scripts/add_total_skipped_column.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text
from core.logger import setup_logger

logger = setup_logger("migration_add_total_skipped")

def run():
    with engine.connect() as conn:
        # Verificar se a coluna já existe
        try:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='scheduled_triggers' AND column_name='total_skipped'"
            ))
            if result.fetchone():
                logger.info("✅ Coluna 'total_skipped' já existe. Nenhuma ação necessária.")
                return
        except Exception:
            pass

        # Adicionar coluna
        conn.execute(text(
            "ALTER TABLE scheduled_triggers ADD COLUMN total_skipped INTEGER DEFAULT 0"
        ))
        conn.commit()
        logger.info("✅ Coluna 'total_skipped' adicionada com sucesso à tabela 'scheduled_triggers'.")

        # Migração retroativa: contar registros de MessageStatus com status='skipped'
        # e atualizar o total_skipped correspondente
        try:
            conn.execute(text("""
                UPDATE scheduled_triggers st
                SET total_skipped = (
                    SELECT COUNT(DISTINCT ms.phone_number)
                    FROM message_status ms
                    WHERE ms.trigger_id = st.id
                    AND ms.status = 'skipped'
                )
                WHERE EXISTS (
                    SELECT 1 FROM message_status ms
                    WHERE ms.trigger_id = st.id
                    AND ms.status = 'skipped'
                )
            """))
            conn.commit()
            logger.info("✅ Migração retroativa de total_skipped concluída.")
        except Exception as e:
            logger.warning(f"⚠️ Migração retroativa não foi possível (pode ser ignorado): {e}")

if __name__ == "__main__":
    run()

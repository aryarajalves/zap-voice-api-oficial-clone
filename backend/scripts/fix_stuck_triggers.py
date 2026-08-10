"""
Script para desastravar disparos em massa que ficaram presos em 'processing'
devido a exceções não tratadas durante o processamento de lotes.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
os.environ["DATABASE_URL"] = "sqlite:///./zapvoice.db"

from database import SessionLocal
import models
from core.logger import setup_logger

logger = setup_logger("fix_stuck_triggers")

def run():
    db = SessionLocal()
    try:
        # Buscar disparos em massa que estejam presos em 'processing'
        stuck_triggers = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.is_bulk == True,
            models.ScheduledTrigger.status == "processing"
        ).all()

        if not stuck_triggers:
            logger.info("✅ Nenhum disparo em massa preso encontrado.")
            return

        for t in stuck_triggers:
            logger.info(f"🔄 Desastravando Trigger #{t.id} (Status atual: {t.status})...")
            
            # Se restam 0 contatos a processar, marcar como completed
            total = t.total_contacts or 0
            sent = t.total_sent or 0
            failed = t.total_failed or 0
            skipped = t.total_skipped or 0
            processed = sent + failed + skipped
            
            if processed >= total or total == 0 or total == 1:
                t.status = "completed"
                logger.info(f"✅ Trigger #{t.id} atualizado para 'completed'.")
            else:
                t.status = "cancelled"
                logger.info(f"🛑 Trigger #{t.id} atualizado para 'cancelled'.")

        db.commit()
        logger.info(f"✅ Total de {len(stuck_triggers)} disparo(s) desastravado(s) com sucesso.")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ao desastravar disparos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()

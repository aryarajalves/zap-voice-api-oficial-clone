import asyncio
from database import SessionLocal
from models import ScheduledTrigger
from services.triggers_service import reconcile_trigger_stats_logic
from core.logger import logger

async def main():
    db = SessionLocal()
    try:
        triggers = db.query(ScheduledTrigger).filter(
            ScheduledTrigger.status != 'deleted_pending'
        ).all()
        logger.info(f"⚙️ Iniciando recálculo de estatísticas para {len(triggers)} disparos...")
        
        for t in triggers:
            # Sessão isolada por trigger para evitar conflitos de transação
            db_trig = SessionLocal()
            try:
                logger.info(f"🔄 Recalculando Trigger #{t.id} ({t.template_name or t.product_name or 'Disparo'})")
                await reconcile_trigger_stats_logic(t.id, t.client_id, db_trig)
            except Exception as e:
                logger.error(f"❌ Erro ao recalcular Trigger #{t.id}: {e}")
            finally:
                db_trig.close()
                
        logger.info("✅ Recálculo de estatísticas concluído com sucesso!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())

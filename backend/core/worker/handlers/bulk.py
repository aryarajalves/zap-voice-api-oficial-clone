import asyncio
import logging
import os
from database import SessionLocal
from services.bulk import process_bulk_send, process_bulk_funnel

logger = logging.getLogger("Worker.Bulk")
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

async def handle_bulk_send(data: dict):
    """
    Processa mensagens de disparo em massa da fila 'zapvoice_bulk_sends'
    """
    logger.info(f"📨 Recebido Job de Bulk Send: {data.get('trigger_id')}")
    
    try:
        trigger_id = data.get("trigger_id")
        
        # Reconstrói os argumentos para a função original
        if data.get("type") == "funnel_bulk":
            await process_bulk_funnel(
                trigger_id=trigger_id,
                funnel_id=data.get("funnel_id"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1)
            )
        else:
            await process_bulk_send(
                trigger_id=trigger_id,
                template_name=data.get("template_name"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1),
                language=data.get("language", "pt_BR"),
                components=data.get("components"),
                direct_message=data.get("direct_message"),
                direct_message_params=data.get("direct_message_params")
            )
            
        logger.info(f"✅ Job de Bulk Send {trigger_id} concluído com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro ao processar Bulk Send {trigger_id}: {e}")
        # Garantir que o status no banco reflita a falha
        db = SessionLocal()
        try:
            from models import ScheduledTrigger
            t = db.query(ScheduledTrigger).get(trigger_id)
            if t:
                t.status = "failed"
                t.failure_reason = f"Erro no Worker: {str(e)}"
                db.commit()
        except Exception as db_err:
            logger.error(f"⚠️ Erro ao atualizar status de falha no DB: {db_err}")
            db.rollback()
        finally:
            db.close()
    finally:
        # Throttling entre jobs
        if MESSAGE_DELAY > 0:
            logger.info(f"⏳ Aguardando {MESSAGE_DELAY}s antes de liberar slot...")
            await asyncio.sleep(MESSAGE_DELAY)

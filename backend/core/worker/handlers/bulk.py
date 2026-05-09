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
    trigger_id = data.get("trigger_id")
    logger.info(f"📨 Recebido Job de Bulk Send: {trigger_id}")
    
    should_wait = True
    try:
        # 1. Trava de Segurança Atômica
        db_lock = SessionLocal()
        try:
            from models import ScheduledTrigger
            # Tenta obter o lock. Se skip_locked=True e já estiver travado, retorna None.
            trigger = db_lock.query(ScheduledTrigger).filter(ScheduledTrigger.id == trigger_id).with_for_update(skip_locked=True).first()
            
            if not trigger:
                # Se não retornou a linha, ou ela não existe ou está bloqueada por outro processo (transação ativa)
                logger.warning(f"🚫 [BULK LOCK] Trigger {trigger_id} está sendo processado por outro worker ou processo atômico. Abortando.")
                should_wait = False # Não gasta slot do worker esperando se foi apenas uma duplicidade de fila
                return
            
            # Log de estado para depuração
            logger.info(f"🔍 [BULK] Verificando Trigger {trigger_id} | Status Atual: {trigger.status}")

            if trigger.status in ['completed', 'processed']:
                logger.info(f"⏭️ [BULK] Trigger {trigger_id} já finalizado. Pulando.")
                should_wait = False
                return
            
            # Se chegamos aqui, temos o lock e o status permite execução.
            # O status DEVE ser 'queued' ou 'processing'. 
            # Se for 'processing' vindo do scheduler, tudo bem, vamos re-iniciar ou continuar.
            
        finally:
            db_lock.close()
        
        # 2. Execução do Processamento Pesado
        async with asyncio.timeout(7200): 
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
            if t and t.status not in ['completed', 'processed', 'cancelled']:
                t.status = "failed"
                t.failure_reason = f"Erro no Worker: {str(e)}"
                db.commit()
        except Exception as db_err:
            logger.error(f"⚠️ Erro ao atualizar status de falha no DB: {db_err}")
            db.rollback()
        finally:
            db.close()
    finally:
        # Throttling entre jobs (Apenas se processou algo)
        if should_wait and MESSAGE_DELAY > 0:
            logger.info(f"⏳ Aguardando {MESSAGE_DELAY}s antes de liberar slot...")
            await asyncio.sleep(MESSAGE_DELAY)

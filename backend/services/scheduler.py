
import asyncio
import models
from database import SessionLocal
from datetime import datetime, timezone
from rabbitmq_client import rabbitmq
from core.logger import setup_logger

logger = setup_logger(__name__)

async def scheduler_task():
    logger.info("Scheduler task started (RabbitMQ Mode)")
    while True:
        try:
            db = SessionLocal()
            now_utc = datetime.now(timezone.utc)
            
            # Pega triggers com delay_until passado e status queued
            # 🔒 SELECT FOR UPDATE SKIP LOCKED - Previne race conditions
            pending_triggers = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.status == 'queued',
                models.ScheduledTrigger.scheduled_time <= now_utc
            ).with_for_update(skip_locked=True).all()
            
            for trigger in pending_triggers:
                logger.info(f"Disparando trigger agendado {trigger.id} para fila...")
                
                # Marca como processing
                trigger.status = "processing"
                db.commit()

                # Notifica Frontend via WS (através do RabbitMQ Events)
                await rabbitmq.publish_event("trigger_updated", {
                    "trigger_id": trigger.id,
                    "client_id": trigger.client_id,
                    "status": "processing"
                })
                
                if trigger.is_bulk:
                     # Monta payload para Bulk Send
                    payload = {
                        "trigger_id": trigger.id,
                        "type": "funnel_bulk" if trigger.funnel_id else "template_bulk",
                        "funnel_id": trigger.funnel_id,
                        "template_name": trigger.template_name.split("|")[0] if trigger.template_name else None,
                        "contacts": trigger.contacts_list,
                        "delay": trigger.delay_seconds,
                        "concurrency": trigger.concurrency_limit,
                        "language": trigger.template_language or 'pt_BR',
                        "components": trigger.template_components,
                        "direct_message": trigger.direct_message,
                        "direct_message_params": trigger.direct_message_params,
                        "private_message": trigger.private_message,
                        "private_message_delay": trigger.private_message_delay,
                        "private_message_concurrency": trigger.private_message_concurrency
                    }
                    await rabbitmq.publish("zapvoice_bulk_sends", payload)
                    
                else: 
                    # Trigger Individual
                    payload = {
                        "trigger_id": trigger.id,
                        "funnel_id": trigger.funnel_id,
                        "conversation_id": trigger.conversation_id,
                        "contact_phone": trigger.contact_phone
                    }
                    await rabbitmq.publish("zapvoice_funnel_executions", payload)
            
            db.close()
        except Exception as e:
            logger.error(f"Scheduler loop error: {e}")
        
        await asyncio.sleep(2)

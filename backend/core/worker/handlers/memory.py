import logging
import httpx
import models
from database import SessionLocal
from config_loader import get_setting
from ..utils import update_node_memory_status

logger = logging.getLogger("Worker.Memory")

async def handle_agent_memory_webhook(data: dict):
    """
    Processa o envio de dados para o Webhook de Memória do Agente de forma sequencial.
    """
    client_id = data.get("client_id")
    phone = data.get("contact_phone")
    trigger_id = data.get("trigger_id")
    node_id = data.get("node_id")
    
    db = SessionLocal()
    try:
        # 1. Buscar a URL mais atualizada do banco para este cliente
        webhook_url = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=client_id)
        
        if not webhook_url or not str(webhook_url).strip():
            logger.warning(f"⚠️ [Webhook Memory Worker] URL não configurada no banco (AppConfig) para o cliente {client_id}.")
            if trigger_id:
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.phone_number == phone
                ).update({"memory_webhook_status": "not_configured"})
                
                if node_id:
                    await update_node_memory_status(db, trigger_id, node_id, "not_configured")
                
                db.commit()
            return

        logger.info(f"🔗 [Webhook Memory Worker] Enviando dados de {phone} para {webhook_url}")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook_url, json=data)
                
                if response.status_code >= 400:
                    error_msg = f"HTTP {response.status_code}"
                    logger.warning(f"⚠️ [Webhook Memory Worker] Retorno inesperado ({error_msg}) de {webhook_url}")
                    if trigger_id:
                        db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger_id,
                            models.MessageStatus.phone_number == phone
                        ).update({"memory_webhook_status": "failed", "memory_webhook_error": error_msg})
                        
                        if node_id:
                            await update_node_memory_status(db, trigger_id, node_id, "failed")
                             
                        db.commit()
                else:
                    logger.info(f"✅ [Webhook Memory Worker] Webhook notificado com sucesso para {phone}")
                    if trigger_id:
                        db.query(models.MessageStatus).filter(
                            models.MessageStatus.trigger_id == trigger_id,
                            models.MessageStatus.phone_number == phone
                        ).update({"memory_webhook_status": "sent"})
                        
                        db.query(models.ScheduledTrigger).filter(
                            models.ScheduledTrigger.id == trigger_id
                        ).update({"total_memory_sent": models.ScheduledTrigger.total_memory_sent + 1})
                        
                        if node_id:
                            await update_node_memory_status(db, trigger_id, node_id, "success")
                             
                            trigger = db.query(models.ScheduledTrigger).get(trigger_id)
                            if trigger:
                                from services.engine import trigger_to_dict
                                from rabbitmq_client import rabbitmq
                                await rabbitmq.publish_event("bulk_progress", trigger_to_dict(trigger))
                        
                        db.commit()
        except Exception as post_err:
            logger.error(f"❌ [Webhook Memory Worker] Erro de conexão ao enviar para {webhook_url}: {post_err}")
            if trigger_id:
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.phone_number == phone
                ).update({"memory_webhook_status": "failed", "memory_webhook_error": str(post_err)})
                
                if node_id:
                    await update_node_memory_status(db, trigger_id, node_id, "failed")
                
                db.commit()
                
    except Exception as e:
        logger.error(f"❌ [Webhook Memory Worker] Falha ao processar envio para {phone}: {e}")
    finally:
        db.close()

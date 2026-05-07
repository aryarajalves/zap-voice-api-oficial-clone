import logging
from datetime import datetime, timezone
from config_loader import get_setting
from services.ai_memory import notify_agent_memory_webhook
from .logging import log_node_execution

logger = logging.getLogger("FunnelEngine.Events")

async def publish_node_external_event(db, trigger, data, content, contact_phone, node_id, event_type="funnel_message_sent"):
    """Publica um evento externo (Memória IA) se o nó estiver configurado."""
    is_memory_configured = bool(get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=trigger.client_id))
    node_toggle_on = data.get("publishExternalEvent", False)
    
    if not node_toggle_on: return
        
    if not is_memory_configured:
        log_node_execution(db, trigger, node_id=node_id, status="completed", details=None, extra_data={"memory_status": "not_configured"})
        return
        
    logger.info(f"🧠 [EXTERNAL EVENT] Nó {node_id} capturado para Memória IA.")

    try:
        log_node_execution(
            db, trigger, 
            node_id=node_id, 
            status="processing", 
            details=None, 
            extra_data={"memory_status": "queued"}
        )

        await notify_agent_memory_webhook(
            client_id=trigger.client_id,
            phone=contact_phone,
            name=trigger.contact_name,
            template_name=f"Node: {event_type}", 
            content=content,
            trigger_id=trigger.id,
            node_id=node_id
        )
    except Exception as e:
        logger.error(f"❌ [EXTERNAL EVENT] Erro ao notificar webhook de memória: {e}")

import asyncio
import time
import logging
import models
from datetime import datetime, timezone
from .logging import log_node_execution

logger = logging.getLogger("FunnelEngine.Sync")

async def wait_for_delivery_sync(db, message_id, trigger, current_node_id, timeout=60):
    """Aguarda confirmação de recebimento via webhook do WhatsApp."""
    if getattr(trigger, 'is_interaction', False):
        return "delivered", "Entregue (Interação)"

    start_time = time.time()
    clean_id = str(message_id).replace("wamid.", "")
    last_log_time = 0
    
    while time.time() - start_time < timeout:
        status_record = db.query(models.MessageStatus).filter(
            (models.MessageStatus.message_id == message_id) |
            (models.MessageStatus.message_id == clean_id)
        ).first()
        
        if status_record:
            if status_record.status in ['delivered', 'read', 'interaction']:
                return "delivered", "Entregue"
            if status_record.status == 'failed':
                return "failed", f"Falha na entrega: {status_record.failure_reason}"
        
        now = time.time()
        if now - last_log_time >= 5:
            elapsed = int(now - start_time)
            log_node_execution(db, trigger, current_node_id, "processing", f"WhatsApp: Aguardando entrega ({elapsed}s)...")
            last_log_time = now
            
        await asyncio.sleep(2)
        try:
            db.expire_all()
            db.refresh(trigger)
        except: pass

    logger.warning(f"⏳ [TIMEOUT] Mensagem {message_id} não confirmada em {timeout}s.")
    trigger.status = 'paused_waiting_delivery'
    log_node_execution(db, trigger, current_node_id, "waiting", "Aguardando recebimento (até 24h)...", {
        "paused_at": datetime.now(timezone.utc).isoformat(),
        "waiting_for_wamid": clean_id
    })
    db.commit()
    return "suspended", "Aguardando internet do contato"

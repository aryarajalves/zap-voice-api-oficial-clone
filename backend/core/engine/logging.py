import logging
from datetime import datetime, timezone
from sqlalchemy.orm.attributes import flag_modified
import models
from .utils import trigger_to_dict
from core.logger import setup_logger

logger = setup_logger("FunnelEngine.Log")

def log_node_execution(db, trigger, node_id, status, details=None, extra_data=None, emit_event=True):
    """Adiciona ou atualiza uma entrada no log de execução do trigger."""
    try:
        # Bloqueia a linha para atualização atômica
        trigger = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.id == trigger.id
        ).with_for_update().first()
        
        if not trigger:
            logger.warning(f"⚠️ [LOG] Trigger não encontrado para logging: {node_id}")
            return

        history = list(trigger.execution_history or [])
        entry = next((item for item in history if item['node_id'] == node_id), None)
        
        if entry:
            if entry.get('status') == 'completed' and status != 'completed':
                return
                
            entry['status'] = status
            entry['updated_at'] = datetime.now(timezone.utc).isoformat()
            if details: entry['details'] = details
            if extra_data: 
                if 'extra' not in entry: entry['extra'] = {}
                entry['extra'].update(extra_data)
        else:
            history.append({
                "node_id": node_id,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "details": details,
                "extra": extra_data or {}
            })
            
        trigger.execution_history = list(history)
        flag_modified(trigger, "execution_history")
        db.commit()
        db.refresh(trigger) 

        if emit_event:
            try:
                import asyncio
                from rabbitmq_client import rabbitmq
                try: loop = asyncio.get_event_loop()
                except RuntimeError: loop = None

                if loop and loop.is_running():
                    loop.create_task(rabbitmq.publish_event("trigger_progress", trigger_to_dict(trigger)))
            except Exception as ev_err:
                logger.warning(f"⚠️ [EVENT] Falha ao emitir evento de progresso: {ev_err}")
    except Exception as e:
        logger.error(f"❌ [ENGINE LOG] Falha ao registrar execução do nó: {e}")
        db.rollback()

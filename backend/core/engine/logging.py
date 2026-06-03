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
        # Forçar expiração do trigger na sessão SQLAlchemy para recarregar do banco fresco
        try:
            db.expire(trigger)
        except Exception:
            pass

        # Bloqueia a linha para atualização atômica
        trigger = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.id == trigger.id
        ).with_for_update().first()
        
        if not trigger:
            logger.warning(f"⚠️ [LOG] Trigger não encontrado para logging: {node_id}")
            return

        # Enriquecer extra_data com os dados do contato para garantir consistência no frontend
        enriched_extra = dict(extra_data) if extra_data is not None else {}
        if "contact_name" not in enriched_extra and trigger.contact_name:
            enriched_extra["contact_name"] = trigger.contact_name
        if "contact_phone" not in enriched_extra and trigger.contact_phone:
            enriched_extra["contact_phone"] = trigger.contact_phone

        history = list(trigger.execution_history or [])
        entry = next((item for item in history if item['node_id'] == node_id), None)
        
        if entry:
            if entry.get('status') == 'completed' and status != 'completed':
                return
                
            entry['status'] = status
            entry['updated_at'] = datetime.now(timezone.utc).isoformat()
            if details: entry['details'] = details
            if enriched_extra: 
                if 'extra' not in entry: entry['extra'] = {}
                entry['extra'].update(enriched_extra)
        else:
            history.append({
                "node_id": node_id,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "details": details,
                "extra": enriched_extra
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

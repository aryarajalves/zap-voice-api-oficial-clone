import logging
import asyncio
from datetime import datetime, timezone, timedelta
import models
from config_loader import get_setting
from .logging import log_node_execution

logger = logging.getLogger("FunnelEngine.LegacyExecutor")

async def execute_legacy_funnel(trigger, steps, chatwoot, conversation_id, contact_phone, db, apply_vars_func):
    total_steps = len(steps)
    if trigger.current_step_index is None:
        trigger.current_step_index = 0
        db.commit()

    while trigger.current_step_index < total_steps:
        step_index = trigger.current_step_index
        step = steps[step_index]
        db.refresh(trigger)
        if trigger.status == 'cancelled': return

        step_type = step.get("type")
        content = step.get("content")
        
        if step_type == "message":
            content_processed = apply_vars_func(content)
            if step.get("buttons"):
                await chatwoot.send_interactive_buttons(contact_phone, content_processed, step.get("buttons"))
            await chatwoot.send_message(conversation_id, content_processed)
            
            db.add(models.MessageStatus(
                trigger_id=trigger.id, message_id=f"legacy_{int(datetime.now().timestamp())}",
                phone_number=contact_phone, status='sent', content=content_processed
            ))
            trigger.total_sent = (trigger.total_sent or 0) + 1
            db.commit()
            log_node_execution(db, trigger, f"step_{step_index}", "completed")

        elif step_type in ["image", "video", "audio", "document"]:
             await chatwoot.send_attachment(conversation_id, content, step_type)

        raw_delay = int(step.get("delay", 0))
        if raw_delay > 0:
            if raw_delay > 60:
                 trigger.status = 'queued'
                 trigger.scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=raw_delay)
                 trigger.current_step_index = step_index + 1
                 db.commit()
                 return
            else:
                await asyncio.sleep(raw_delay)

        trigger.current_step_index = step_index + 1
        db.commit()
    
    trigger.status = 'completed'
    client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=trigger.client_id)
    log_node_execution(db, trigger, "FINISH", "completed", f"{client_name}: Funil (Lista) concluído com sucesso.")
    db.commit()

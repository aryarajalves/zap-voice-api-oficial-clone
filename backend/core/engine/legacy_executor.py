import asyncio
from core.logger import setup_logger
from datetime import datetime, timezone, timedelta
import models
from config_loader import get_setting
from .logging import log_node_execution

logger = setup_logger("FunnelEngine.LegacyExecutor")

async def execute_legacy_funnel(trigger, steps, chatwoot, conversation_id, contact_phone, db, apply_vars_func):
    total_steps = len(steps)
    if trigger.current_step_index is None:
        try:
            db.expire(trigger)
        except Exception:
            pass
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
            # ZapVoice-only: Chatwoot removido — envio sempre via Meta Direto,
            # igual ao padrão já usado em nodes/message.py.
            if step.get("buttons"):
                res = await chatwoot.send_interactive_buttons(contact_phone, content_processed, step.get("buttons"))
            else:
                res = await chatwoot.send_text_official(contact_phone, content_processed)

            if not res or (isinstance(res, dict) and res.get("error")):
                logger.error(f"❌ [LEGACY] Falha ao enviar mensagem (step {step_index}) para {contact_phone}: {res}")
                try:
                    db.expire(trigger)
                except Exception:
                    pass
                trigger.status = 'failed'
                trigger.failure_reason = f"Meta API (Legacy Message): {res.get('error') if isinstance(res, dict) else 'Unknown'}"
                db.commit()
                return

            msg_id = None
            if isinstance(res, dict):
                messages = res.get("messages")
                if messages:
                    msg_id = messages[0].get("id")
            msg_id_clean = str(msg_id).replace("wamid.", "") if msg_id else f"legacy_{int(datetime.now().timestamp())}"

            db.add(models.MessageStatus(
                trigger_id=trigger.id, message_id=msg_id_clean,
                phone_number=contact_phone, status='sent', content=content_processed
            ))
            try:
                db.expire(trigger)
            except Exception:
                pass
            trigger.total_sent = (trigger.total_sent or 0) + 1
            db.commit()
            log_node_execution(db, trigger, f"step_{step_index}", "completed")

        elif step_type in ["image", "video", "audio", "document"]:
            # ZapVoice-only: Chatwoot removido — envio sempre via Meta Direto.
            if step_type == "image":
                res = await chatwoot.send_image_official(contact_phone, content)
            elif step_type == "video":
                res = await chatwoot.send_video_official(contact_phone, content)
            elif step_type == "audio":
                res = await chatwoot.send_audio_official(contact_phone, content)
            else:
                res = await chatwoot.send_document_official(contact_phone, content)

            if not res or (isinstance(res, dict) and res.get("error")):
                logger.error(f"❌ [LEGACY] Falha ao enviar mídia ({step_type}, step {step_index}) para {contact_phone}: {res}")
                try:
                    db.expire(trigger)
                except Exception:
                    pass
                trigger.status = 'failed'
                trigger.failure_reason = f"Meta API (Legacy Media): {res.get('error') if isinstance(res, dict) else 'Unknown'}"
                db.commit()
                return

            msg_id = None
            if isinstance(res, dict):
                messages = res.get("messages")
                if messages:
                    msg_id = messages[0].get("id")
            msg_id_clean = str(msg_id).replace("wamid.", "") if msg_id else f"legacy_{int(datetime.now().timestamp())}"

            db.add(models.MessageStatus(
                trigger_id=trigger.id, message_id=msg_id_clean,
                phone_number=contact_phone, status='sent', content=f"[{step_type}] {content}"
            ))
            try:
                db.expire(trigger)
            except Exception:
                pass
            trigger.total_sent = (trigger.total_sent or 0) + 1
            db.commit()
            log_node_execution(db, trigger, f"step_{step_index}", "completed")

        raw_delay = int(step.get("delay", 0))
        if raw_delay > 0:
            if raw_delay > 60:
                 try:
                     db.expire(trigger)
                 except Exception:
                     pass
                 trigger.status = 'queued'
                 trigger.scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=raw_delay)
                 trigger.current_step_index = step_index + 1
                 db.commit()
                 return
            else:
                await asyncio.sleep(raw_delay)

        try:
            db.expire(trigger)
        except Exception:
            pass
        trigger.current_step_index = step_index + 1
        db.commit()
    
    try:
        db.expire(trigger)
    except Exception:
        pass
    trigger.status = 'completed'
    client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=trigger.client_id)
    log_node_execution(db, trigger, "FINISH", "completed", f"{client_name}: Funil (Lista) concluído com sucesso.")
    try:
        db.expire(trigger)
    except Exception:
        pass
    db.commit()

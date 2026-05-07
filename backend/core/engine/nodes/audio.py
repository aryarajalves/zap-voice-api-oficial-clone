import logging
import asyncio
from datetime import datetime, timezone, timedelta
import models
from ..utils import validate_media_url, apply_vars
from ..logging import log_node_execution
from ..sync import wait_for_delivery_sync
from ..events import publish_node_external_event
from ..business_hours import is_within_business_hours, get_next_business_hour_start
from services.window_manager import get_best_conversation, is_window_open_strict

logger = logging.getLogger("FunnelEngine.Nodes.Audio")

async def handle_audio_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel):
    data = node.get("data", {})
    current_node_id = node["id"]
    
    if data.get("onlyBusinessHours") and not is_within_business_hours(funnel):
        trigger.status = 'queued'
        trigger.scheduled_time = get_next_business_hour_start(funnel)
        trigger.current_node_id = current_node_id
        db.commit()
        return "stop"

    from storage import storage
    file_url = data.get("mediaUrl") or data.get("url")
    if file_url:
        file_url = storage.get_public_url(file_url)
    
    if not file_url: return "continue"

    is_valid, err_msg = await validate_media_url(file_url)
    if not is_valid:
        trigger.status = 'failed'
        trigger.failure_reason = err_msg
        db.commit()
        log_node_execution(db, trigger, current_node_id, "failed", err_msg)
        return "abort"
    
    log_node_execution(db, trigger, current_node_id, "processing", "🎵 Preparando áudio...")
    log_node_execution(db, trigger, current_node_id, "started", None, {
        "media_type": "audio", "media_url": file_url, "media_file": data.get("fileName", "Áudio")
    })
    
    if conversation_id and int(conversation_id) > 0:
        resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)
        if resolved_convo_id != conversation_id:
            conversation_id = resolved_convo_id
            trigger.conversation_id = resolved_convo_id
            db.commit()

        if not await is_window_open_strict(trigger.client_id, contact_phone, conversation_id, db, chatwoot):
            trigger.status = 'failed'
            trigger.failure_reason = "Janela de 24h fechada para envio de mensagem de sessão (Áudio)."
            db.commit()
            return "abort"

        res = await chatwoot.send_attachment(conversation_id, file_url, "audio")
        if res and isinstance(res, dict) and res.get("id"):
            msg_id = res.get("source_id") or str(res.get("id"))
            if not trigger.is_bulk:
                log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação do WhatsApp...")
                state, detail = await wait_for_delivery_sync(db, msg_id, trigger, current_node_id)
                if state == "suspended": return "stop"
                if state == "failed":
                    trigger.status = 'failed'
                    trigger.failure_reason = detail
                    db.commit()
                    return "abort"
                if not getattr(trigger, 'is_interaction', False):
                    await asyncio.sleep(10)
        else:
            trigger.status = 'failed'
            trigger.failure_reason = f"Chatwoot Audio Error: {res.get('error') if isinstance(res, dict) else 'Unknown'}"
            db.commit()
            return "abort"
    else:
        res = await chatwoot.send_audio_official(contact_phone, file_url)
        if not getattr(trigger, 'is_interaction', False):
            await asyncio.sleep(10)
        if res and not res.get("error"):
            msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
        else:
            trigger.status = 'failed'
            trigger.failure_reason = f"Meta API (Audio): {res.get('error') if res else 'Unknown'}"
            db.commit()
            return "abort"
    
    if msg_id:
        msg_id_clean = str(msg_id).replace("wamid.", "")
        new_ms = models.MessageStatus(
            trigger_id=trigger.id, message_id=msg_id_clean, phone_number=contact_phone,
            status='sent', message_type='FREE_MESSAGE', content=f"[Áudio: {file_url}]",
            publish_external_event=data.get("publishExternalEvent", False)
        )
        if data.get("sendPrivateNote") and data.get("privateNoteContent"):
            new_ms.pending_private_note = apply_vars_func(data.get("privateNoteContent"))
        db.add(new_ms)
        db.commit()

    await publish_node_external_event(db, trigger, data, f"[Áudio: {file_url}]", contact_phone, node_id=current_node_id, event_type="funnel_audio_sent")
    log_node_execution(db, trigger, current_node_id, "completed", "Áudio enviado e sincronizado.")
    return {"status": "continue", "conversation_id": conversation_id}

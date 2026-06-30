import asyncio
from datetime import datetime, timezone, timedelta
import models
from core.logger import setup_logger
from ..utils import validate_media_url, apply_vars
from ..logging import log_node_execution
from ..sync import wait_for_delivery_sync
from ..events import publish_node_external_event
from ..business_hours import is_within_business_hours, get_next_business_hour_start
from services.window_manager import get_best_conversation, is_window_open_strict

logger = setup_logger("FunnelEngine.Nodes.Audio")

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

    res = await chatwoot.send_audio_official(contact_phone, file_url)
    if res and not res.get("error"):
        msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
        
        # Criar o MessageStatus imediatamente para que os webhooks de status possam localizá-lo e atualizá-lo
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

        # --- SINCRONIZAR COM O CHAT LOCAL ---
        try:
            from core.engine.sync_utils import sync_message_to_local_chat
            await sync_message_to_local_chat(
                db=db,
                client_id=trigger.client_id,
                phone=contact_phone,
                contact_name=trigger.contact_name,
                content="",
                message_type="audio",
                media_url=file_url,
                wa_message_id=msg_id_clean
            )
        except Exception as e_local:
            logger.error(f"❌ [CHAT-LOCAL] Erro ao sincronizar áudio localmente: {e_local}")

        # --- Sincronizar o envio com o Chatwoot ---
        try:
            logger.info(f"🔄 [SYNC_CHATWOOT] Sincronizando áudio enviado via Meta Direto para {contact_phone}")
            effective_inbox_id = trigger.chatwoot_inbox_id
            if not effective_inbox_id:
                from config_loader import get_setting
                inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=trigger.client_id)
                if inbox_id_str and str(inbox_id_str).isdigit():
                    effective_inbox_id = int(inbox_id_str)
            
            from core.engine.sync_utils import safe_chatwoot_sync
            
            async def do_sync_audio(c_id):
                # Criar apenas a mensagem informativa em texto no Chatwoot para evitar duplicidade de envio via anexo do Chatwoot (evitando erro 131053)
                await chatwoot.create_message(c_id, f"[Áudio enviado: {file_url}]", "outgoing")
                
            await safe_chatwoot_sync(
                db=db,
                trigger=trigger,
                contact_phone=contact_phone,
                client_id=trigger.client_id,
                effective_inbox_id=effective_inbox_id,
                chatwoot_client=chatwoot,
                sync_fn=do_sync_audio
            )
            conversation_id = trigger.conversation_id
            logger.info(f"✅ [SYNC_CHATWOOT] Registro de áudio postado no Chatwoot (Conversa {conversation_id})")
        except Exception as e_sync:
            logger.error(f"❌ [SYNC_CHATWOOT] Erro ao sincronizar áudio no Chatwoot: {e_sync}")
        
        if not getattr(trigger, 'is_interaction', False):
            await asyncio.sleep(10)
    else:
        trigger.status = 'failed'
        trigger.failure_reason = f"Meta API (Audio): {res.get('error') if res else 'Unknown'}"
        db.commit()
        return "abort"

    await publish_node_external_event(db, trigger, data, f"[Áudio: {file_url}]", contact_phone, node_id=current_node_id, event_type="funnel_audio_sent")
    log_node_execution(db, trigger, current_node_id, "completed", "Áudio enviado e sincronizado.")
    return {"status": "continue", "conversation_id": conversation_id}


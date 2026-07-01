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

logger = setup_logger("FunnelEngine.Nodes.Media")

async def handle_media_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel, chatwoot_contact_id=None):
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
    
    media_type = data.get("mediaType", "image")
    caption = data.get("caption", "")
    
    if not file_url: return "continue"

    is_valid, err_msg = await validate_media_url(file_url)
    if not is_valid:
        trigger.status = 'failed'
        trigger.failure_reason = err_msg
        db.commit()
        log_node_execution(db, trigger, current_node_id, "failed", err_msg)
        return "abort"

    caption_processed = apply_vars_func(caption)
    log_node_execution(db, trigger, current_node_id, "processing", "📁 Processando Mídia...")
    log_node_execution(db, trigger, current_node_id, "started", None, {
        "media_type": media_type, "media_url": file_url, "media_file": data.get("fileName", "Mídia"), "caption": caption_processed
    })
    
    # ZapVoice-only: sempre usa Meta Direto. Chatwoot foi removido do sistema.
    is_chatwoot_active = False

    if is_chatwoot_active and conversation_id and int(conversation_id) > 0:
        if chatwoot_contact_id and conversation_id and int(conversation_id) > 0:
            resolved_convo_id = conversation_id
        else:
            resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)

        if resolved_convo_id != conversation_id:
            conversation_id = resolved_convo_id
            trigger.conversation_id = resolved_convo_id
            db.commit()

        res = await chatwoot.send_attachment(conversation_id, file_url, media_type, caption=caption_processed)
        if res and isinstance(res, dict) and res.get("id"):
            msg_id = res.get("source_id") or str(res.get("id"))
            
            # Criar o MessageStatus imediatamente para que os webhooks de status possam localizá-lo e atualizá-lo
            msg_id_clean = str(msg_id).replace("wamid.", "")
            db.add(models.MessageStatus(
                trigger_id=trigger.id, message_id=msg_id_clean, phone_number=contact_phone,
                status='sent', message_type='FREE_MESSAGE', content=f"[{media_type.capitalize()}: {file_url}]",
                publish_external_event=data.get("publishExternalEvent", False)
            ))
            db.commit()

            # --- SINCRONIZAR COM O CHAT LOCAL ---
            try:
                from core.engine.sync_utils import sync_message_to_local_chat
                await sync_message_to_local_chat(
                    db=db,
                    client_id=trigger.client_id,
                    phone=contact_phone,
                    contact_name=trigger.contact_name,
                    content=caption_processed,
                    message_type=media_type,
                    media_url=file_url,
                    wa_message_id=msg_id_clean
                )
            except Exception as e_local:
                logger.error(f"❌ [CHAT-LOCAL] Erro ao sincronizar mídia localmente (via Atendimento): {e_local}")

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
            trigger.failure_reason = f"Erro de Mídia no Atendimento: {res.get('error') if isinstance(res, dict) else 'Unknown'}"
            db.commit()
            return "abort"
    else:
        # Enviar via Meta Direto
        res = None
        if media_type == "image":
            res = await chatwoot.send_image_official(contact_phone, file_url, caption=caption_processed)
        elif media_type == "video":
            res = await chatwoot.send_video_official(contact_phone, file_url, caption=caption_processed)
        elif media_type == "audio":
            res = await chatwoot.send_audio_official(contact_phone, file_url)
        elif media_type in ["document", "file"]:
            res = await chatwoot.send_document_official(contact_phone, file_url, caption=caption_processed, filename=data.get("fileName", "documento"))
        else:
            logger.warning(f"⚠️ Tipo de mídia '{media_type}' não suportado no envio oficial direto.")
            return "continue"

        if res and not res.get("error"):
            msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
            
            # Criar o MessageStatus imediatamente para que os webhooks de status possam localizá-lo e atualizá-lo
            msg_id_clean = str(msg_id).replace("wamid.", "")
            db.add(models.MessageStatus(
                trigger_id=trigger.id, message_id=msg_id_clean, phone_number=contact_phone,
                status='sent', message_type='FREE_MESSAGE', content=f"[{media_type.capitalize()}: {file_url}]",
                publish_external_event=data.get("publishExternalEvent", False)
            ))
            db.commit()

            # --- SINCRONIZAR COM O CHAT LOCAL ---
            try:
                from core.engine.sync_utils import sync_message_to_local_chat
                await sync_message_to_local_chat(
                    db=db,
                    client_id=trigger.client_id,
                    phone=contact_phone,
                    contact_name=trigger.contact_name,
                    content=caption_processed,
                    message_type=media_type,
                    media_url=file_url,
                    wa_message_id=msg_id_clean
                )
            except Exception as e_local:
                logger.error(f"❌ [CHAT-LOCAL] Erro ao sincronizar mídia localmente (Meta path): {e_local}")

            # --- Sincronizar o envio com o Chatwoot (se estiver ativo) ---
            if is_chatwoot_active:
                try:
                    logger.info(f"🔄 [SYNC_ATENDIMENTO] Sincronizando mídia ({media_type}) enviada via Meta Direto para {contact_phone}")
                    effective_inbox_id = trigger.chatwoot_inbox_id
                    if not effective_inbox_id:
                        from config_loader import get_setting
                        inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=trigger.client_id)
                        if inbox_id_str and str(inbox_id_str).isdigit():
                            effective_inbox_id = int(inbox_id_str)
                    
                    from core.engine.sync_utils import safe_chatwoot_sync
                    
                    async def do_sync_media(c_id):
                        await chatwoot.send_attachment(c_id, file_url, media_type, caption=caption_processed)
                        
                    await safe_chatwoot_sync(
                        db=db,
                        trigger=trigger,
                        contact_phone=contact_phone,
                        client_id=trigger.client_id,
                        effective_inbox_id=effective_inbox_id,
                        chatwoot_client=chatwoot,
                        sync_fn=do_sync_media
                    )
                    conversation_id = trigger.conversation_id
                    logger.info(f"✅ [SYNC_ATENDIMENTO] Cópia da mídia postada no Atendimento (Conversa {conversation_id})")
                except Exception as e_sync:
                    logger.error(f"❌ [SYNC_ATENDIMENTO] Erro ao sincronizar mídia no Atendimento: {e_sync}")
            
            if not getattr(trigger, 'is_interaction', False): await asyncio.sleep(10)
        else:
            trigger.status = 'failed'
            trigger.failure_reason = f"Meta API (Media): {res.get('error') if res else 'Unknown'}"
            db.commit()
            return "abort"

    await publish_node_external_event(db, trigger, data, f"[{media_type.capitalize()}: {file_url}] {caption_processed}", contact_phone, node_id=current_node_id, event_type=f"funnel_{media_type}_sent")
    log_node_execution(db, trigger, current_node_id, "completed", "Mídia enviada e sincronizada.")
    return {"status": "continue", "conversation_id": conversation_id}

import random
from core.logger import setup_logger
import asyncio
from datetime import datetime, timezone, timedelta
import models
from ..utils import BRAZIL_TZ, apply_vars
from ..logging import log_node_execution
from ..sync import wait_for_delivery_sync
from ..events import publish_node_external_event
from ..business_hours import is_within_business_hours, get_next_business_hour_start
from services.window_manager import get_best_conversation, is_window_open_strict

logger = setup_logger("FunnelEngine.Nodes.Message")

async def handle_message_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, funnel):
    data = node.get("data", {})
    current_node_id = node["id"]
    
    # Horário Comercial
    if data.get("onlyBusinessHours"):
        if not is_within_business_hours(funnel):
            next_run = get_next_business_hour_start(funnel)
            trigger.status = 'queued'
            trigger.scheduled_time = next_run
            trigger.current_node_id = current_node_id
            db.commit()
            return "stop"

    content = data.get("content", "")
    variations = data.get("variations", [])
    options = [content] if content else []
    options.extend([v for v in variations if v.strip()])
    
    if not options:
        logger.warning(f"⚠️ Message Node {current_node_id} vazio.")
        return "continue"

    log_node_execution(db, trigger, current_node_id, "processing", "📩 Enviando mensagem...")
    final_content = apply_vars_func(random.choice(options))
    log_node_execution(db, trigger, current_node_id, "started", None, {
        "content": final_content,
        "conversation_id": str(conversation_id) if conversation_id else None,
        "account_id": str(trigger.chatwoot_account_id) if trigger.chatwoot_account_id else None,
    })
    db.refresh(trigger)

    # ZapVoice-only: sempre usa Meta Direto. Chatwoot foi removido do sistema.
    is_chatwoot_active = False

    if is_chatwoot_active and conversation_id and int(conversation_id) > 0:
        resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)
        if resolved_convo_id != conversation_id:
            conversation_id = resolved_convo_id
            trigger.conversation_id = resolved_convo_id
            db.commit()

        if not await is_window_open_strict(trigger.client_id, contact_phone, conversation_id, db, chatwoot):
            trigger.status = 'failed'
            trigger.failure_reason = "Janela de 24h fechada para envio de mensagem de sessão (Texto)."
            db.commit()
            return "abort"

        # Verificar se botões foram configurados
        buttons = [b.strip() for b in data.get("buttons", []) if b.strip()]
        if buttons:
            res = await chatwoot.send_interactive_buttons(contact_phone, final_content, buttons)
            if res and isinstance(res, dict) and not res.get("error"):
                raw_msg_id = res.get("messages", [{}])[0].get("id") or str(res.get("id")) if res.get("messages") else str(res.get("id"))
                msg_id_clean = str(raw_msg_id).replace("wamid.", "")
                
                db.add(models.MessageStatus(
                    trigger_id=trigger.id,
                    message_id=msg_id_clean,
                    phone_number=contact_phone,
                    status='sent',
                    message_type='FREE_MESSAGE',
                    content=final_content,
                    publish_external_event=data.get("publishExternalEvent", False)
                ))
                trigger.total_sent = (trigger.total_sent or 0) + 1
                
                try:
                    formatted_copy = final_content + "\n\n🔘 [Botões]: " + ", ".join([f"[{b}]" for b in buttons])
                    
                    from core.engine.sync_utils import safe_chatwoot_sync
                    effective_inbox_id = trigger.chatwoot_inbox_id
                    if not effective_inbox_id:
                        from config_loader import get_setting
                        inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=trigger.client_id)
                        if inbox_id_str and str(inbox_id_str).isdigit():
                            effective_inbox_id = int(inbox_id_str)
                            
                    async def do_sync_chatwoot_buttons(c_id):
                        await chatwoot.send_private_note(c_id, formatted_copy)
                        
                    await safe_chatwoot_sync(
                        db=db,
                        trigger=trigger,
                        contact_phone=contact_phone,
                        client_id=trigger.client_id,
                        effective_inbox_id=effective_inbox_id,
                        chatwoot_client=chatwoot,
                        sync_fn=do_sync_chatwoot_buttons
                    )
                    conversation_id = trigger.conversation_id
                except Exception as e_sync:
                    logger.error(f"❌ [SYNC_ATENDIMENTO] Erro ao enviar nota privada no Atendimento: {e_sync}")
                
                trigger.status = 'suspended'
                trigger.current_node_id = current_node_id
                db.commit()
                
                await publish_node_external_event(db, trigger, data, final_content, contact_phone, node_id=current_node_id)
                log_node_execution(db, trigger, current_node_id, "suspended", "Mensagem com botões enviada. Funil suspenso aguardando interação.")
                return "stop"
            else:
                trigger.status = 'failed'
                trigger.failure_reason = f"Erro no Atendimento: {res.get('detail') or res.get('error') if isinstance(res, dict) else 'Unknown'}"
                db.commit()
                return "abort"
        else:
            # Enviar via Chatwoot
            effective_inbox_id = trigger.chatwoot_inbox_id
            if not effective_inbox_id:
                from config_loader import get_setting
                inbox_id_str = get_setting("CHATWOOT_SELECTED_INBOX_ID", client_id=trigger.client_id)
                if inbox_id_str and str(inbox_id_str).isdigit():
                    effective_inbox_id = int(inbox_id_str)
                    
            from core.engine.sync_utils import safe_chatwoot_sync
            res = None
            async def do_send_message(c_id):
                nonlocal res
                res = await chatwoot.send_message(c_id, final_content)
                
            await safe_chatwoot_sync(
                db=db,
                trigger=trigger,
                contact_phone=contact_phone,
                client_id=trigger.client_id,
                effective_inbox_id=effective_inbox_id,
                chatwoot_client=chatwoot,
                sync_fn=do_send_message
            )
            conversation_id = trigger.conversation_id

        if res and isinstance(res, dict) and not res.get("error"):
            raw_msg_id = res.get("source_id") or str(res.get("id"))
            msg_id = raw_msg_id

            # Criar o MessageStatus imediatamente para que os webhooks de status possam localizá-lo e atualizá-lo
            msg_id_clean = str(msg_id).replace("wamid.", "")
            existing_ms = db.query(models.MessageStatus).filter_by(message_id=msg_id_clean).first()
            if not existing_ms:
                db.add(models.MessageStatus(
                    trigger_id=trigger.id,
                    message_id=msg_id_clean,
                    phone_number=contact_phone,
                    status='sent',
                    message_type='FREE_MESSAGE',
                    content=final_content,
                    publish_external_event=data.get("publishExternalEvent", False)
                ))
                trigger.total_sent = (trigger.total_sent or 0) + 1
                db.commit()

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
                    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                    log_node_execution(db, trigger, "STABILIZATION", "processing", f"{detail}. Estabilizando...", {"target_time": target_time})
                    await asyncio.sleep(10)
                    log_node_execution(db, trigger, "STABILIZATION", "completed", "Estabilização concluída.")
            else: msg_id = msg_id
        else:
            trigger.status = 'failed'
            trigger.failure_reason = f"Erro no Atendimento: {res.get('detail') or res.get('error') if isinstance(res, dict) else 'Unknown'}"
            db.commit()
            return "abort"
    else:
        # Enviar via Meta Direto
        buttons = [b.strip() for b in data.get("buttons", []) if b.strip()]
        if buttons:
            logger.info(f"📤 [MSG-NODE] Enviando interativo com botões para {contact_phone} (trigger={trigger.id})")
            res = await chatwoot.send_interactive_buttons(contact_phone, final_content, buttons)
            logger.info(f"📨 [MSG-NODE] Resposta Meta (botões) para {contact_phone}: {str(res)[:300]}")
            if res and not res.get("error"):
                msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
                msg_id_clean = str(msg_id).replace("wamid.", "")
                
                db.add(models.MessageStatus(
                    trigger_id=trigger.id,
                    message_id=msg_id_clean,
                    phone_number=contact_phone,
                    status='sent',
                    message_type='FREE_MESSAGE',
                    content=final_content,
                    publish_external_event=data.get("publishExternalEvent", False)
                ))
                trigger.total_sent = (trigger.total_sent or 0) + 1

                trigger.status = 'suspended'
                trigger.current_node_id = current_node_id
                db.commit()
                
                await publish_node_external_event(db, trigger, data, final_content, contact_phone, node_id=current_node_id)
                log_node_execution(db, trigger, current_node_id, "suspended", "Mensagem com botões enviada (Meta Direto). Funil suspenso.")
                return "stop"
            else:
                trigger.status = 'failed'
                trigger.failure_reason = f"Meta API: {res.get('error') if res else 'Unknown'}"
                db.commit()
                return "abort"
        else:
            logger.info(f"📤 [MSG-NODE] Enviando via Meta Direto para {contact_phone} (trigger={trigger.id})")
            res = await chatwoot.send_text_official(contact_phone, final_content)
            logger.info(f"📨 [MSG-NODE] Resposta Meta para {contact_phone}: {str(res)[:300]}")
            if not getattr(trigger, 'is_interaction', False):
                await asyncio.sleep(10)

            if res and not res.get("error"):
                msg_id = res.get("messages", [{}])[0].get("id", "direct_meta")
            else:
                trigger.status = 'failed'
                trigger.failure_reason = f"Meta API: {res.get('error') if res else 'Unknown'}"
                db.commit()
                return "abort"

    if msg_id:
        msg_id_clean = str(msg_id).replace("wamid.", "")
        existing_ms = db.query(models.MessageStatus).filter_by(message_id=msg_id_clean).first()
        if not existing_ms:
            db.add(models.MessageStatus(
                trigger_id=trigger.id,
                message_id=msg_id_clean,
                phone_number=contact_phone,
                status='sent',
                message_type='FREE_MESSAGE',
                content=final_content,
                publish_external_event=data.get("publishExternalEvent", False)
            ))
            trigger.total_sent = (trigger.total_sent or 0) + 1
            db.commit()

        # --- SINCRONIZAR COM O CHAT LOCAL ---
        try:
            from core.engine.sync_utils import sync_message_to_local_chat
            buttons = [b.strip() for b in data.get("buttons", []) if b.strip()]
            formatted_text = final_content
            if buttons:
                formatted_text += "\n\n🔘 [Botões]: " + ", ".join([f"[{b}]" for b in buttons])
            
            await sync_message_to_local_chat(
                db=db,
                client_id=trigger.client_id,
                phone=contact_phone,
                contact_name=trigger.contact_name,
                content=formatted_text,
                message_type="text",
                wa_message_id=msg_id_clean
            )
        except Exception as e_local:
            logger.error(f"❌ [CHAT-LOCAL] Erro ao sincronizar mensagem local no final do nó: {e_local}")

    await publish_node_external_event(db, trigger, data, final_content, contact_phone, node_id=current_node_id)
    log_node_execution(db, trigger, current_node_id, "completed", "Mensagem enviada e sincronizada.", {"content": final_content})
    return {"status": "continue", "conversation_id": conversation_id}

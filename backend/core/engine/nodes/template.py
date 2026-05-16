import logging
import asyncio
from datetime import datetime, timezone, timedelta
import models
from ..utils import apply_vars
from ..logging import log_node_execution
from ..sync import wait_for_delivery_sync
from ..events import publish_node_external_event
from services.window_manager import get_best_conversation

logger = logging.getLogger("FunnelEngine.Nodes.Template")

async def handle_template_node(db, trigger, node, chatwoot, conversation_id, contact_phone, apply_vars_func, chatwoot_contact_id=None):
    data = node.get("data", {})
    current_node_id = node["id"]
    template_name = data.get("templateName")
    language = data.get("language", "pt_BR")
    components = data.get("components") or [] 
    
    check_window = data.get("check24hWindow", False)
    fallback_msg = data.get("fallbackMessage")
    fallback_buttons = data.get("fallbackButtons")
    fallback_sent = False

    if check_window:
        if chatwoot_contact_id and conversation_id and int(conversation_id) > 0:
            resolved_convo_id = conversation_id
        else:
            resolved_convo_id = await get_best_conversation(trigger.client_id, contact_phone, conversation_id, db, chatwoot)

        if resolved_convo_id != conversation_id:
            conversation_id = resolved_convo_id
            trigger.conversation_id = resolved_convo_id
            db.commit()
        
        window_open = await chatwoot.is_within_24h_window(conversation_id)
        if window_open and fallback_msg and fallback_msg.strip():
            log_node_execution(db, trigger, current_node_id, "processing", "Sessão aberta: Enviando Fallback...")
            try:
                if fallback_buttons: res = await chatwoot.send_interactive_buttons(contact_phone, fallback_msg, fallback_buttons)
                else: res = await chatwoot.send_message(conversation_id, fallback_msg)
                
                fb_msg_id = None
                if isinstance(res, dict):
                    if res.get("messages"): fb_msg_id = res["messages"][0].get("id")
                    elif res.get("id"): fb_msg_id = res.get("source_id") or str(res.get("id"))
                
                if fb_msg_id:
                    fb_msg_clean = fb_msg_id.replace("wamid.", "")
                    if not trigger.is_bulk:
                        log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação (Fallback)...")
                        state, detail = await wait_for_delivery_sync(db, fb_msg_clean, trigger, current_node_id)
                        if state == "suspended": return "stop"
                        if state == "failed":
                            trigger.status = 'failed'
                            trigger.failure_reason = detail
                            db.commit()
                            return "abort"
                        if not getattr(trigger, 'is_interaction', False): await asyncio.sleep(10)

                    db.add(models.MessageStatus(
                        trigger_id=trigger.id, message_id=fb_msg_clean, phone_number=contact_phone,
                        status='sent', message_type='FREE_MESSAGE', content=fallback_msg,
                        publish_external_event=data.get("publishExternalEvent", False)
                    ))
                    trigger.total_sent = (trigger.total_sent or 0) + 1
                    db.commit()
                    fallback_sent = True
                    template_name = None
            except Exception as e:
                logger.error(f"❌ Erro fallback: {e}")
                trigger.status = 'failed'
                db.commit()
                return "abort"

    if template_name:
        p_msg = data.get("privateMessage", "")
        result = await chatwoot.send_template(contact_phone, template_name, language, components)
        
        if isinstance(result, dict) and result.get("error"):
            if not trigger.is_bulk:
                trigger.status = 'failed'
                trigger.failure_reason = str(result.get('detail'))
            db.commit()
            return "abort"
        
        if isinstance(result, dict) and result.get("messages"):
            raw_id = result["messages"][0].get("id")
            wamid = raw_id.replace("wamid.", "") if raw_id else raw_id
            if wamid:
                if not trigger.is_bulk:
                    log_node_execution(db, trigger, current_node_id, "processing", "Aguardando confirmação (Template)...")
                    state, detail = await wait_for_delivery_sync(db, wamid, trigger, current_node_id)
                    if state == "suspended": return "stop"
                    if state == "failed":
                        trigger.status = 'failed'
                        trigger.failure_reason = detail
                        db.commit()
                        return "abort"
                    if not getattr(trigger, 'is_interaction', False): await asyncio.sleep(10)

                template_body = None
                try:
                    tpl_cache = db.query(models.WhatsAppTemplateCache).filter(models.WhatsAppTemplateCache.name == template_name, models.WhatsAppTemplateCache.client_id == trigger.client_id).first()
                    if tpl_cache: template_body = tpl_cache.body
                except: pass

                content_val = template_body or f"[Template: {template_name}]"
                new_ms = models.MessageStatus(
                    trigger_id=trigger.id, message_id=wamid, phone_number=contact_phone,
                    status='sent', message_type='TEMPLATE', content=content_val,
                    publish_external_event=data.get("publishExternalEvent", False)
                )
                # Sempre envia o conteúdo do template como nota privada para o Chatwoot automaticamente
                final_p_msg = content_val
                if fallback_sent:
                    final_p_msg += "\n\n📢 [Sessão 24h] Enviado via Mensagem Direta (Grátis)."
                else:
                    final_p_msg += f"\n\n📢 Enviado via Template: {template_name}"
                new_ms.pending_private_note = final_p_msg
                
                db.add(new_ms)
                trigger.total_sent = (trigger.total_sent or 0) + 1
                db.commit()
                    
                await publish_node_external_event(db, trigger, data, template_body or f"[Template: {template_name}]", contact_phone, node_id=current_node_id, event_type="funnel_template_sent")
                log_node_execution(db, trigger, current_node_id, "completed", f"Template: {template_name}", {"template_name": template_name, "content": template_body or f"Template: {template_name}"})

    return {"status": "continue", "conversation_id": conversation_id}

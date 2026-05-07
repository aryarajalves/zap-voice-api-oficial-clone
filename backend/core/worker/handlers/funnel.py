import asyncio
import logging
import os
import models
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from chatwoot_client import ChatwootClient
from services.bulk import render_template_body, sanitize_template_components
from services.engine import execute_funnel, log_node_execution, wait_for_delivery_sync
from services.ai_memory import notify_agent_memory_webhook
from services.leads import upsert_webhook_lead
from rabbitmq_client import rabbitmq

logger = logging.getLogger("Worker.Funnel")
MESSAGE_DELAY = float(os.getenv("RABBITMQ_MESSAGE_DELAY", 1.0))

async def handle_funnel_execution(data: dict):
    """
    Processa execuções de funil da fila 'zapvoice_funnel_executions'
    """
    trigger_id = data.get('trigger_id')
    phone = data.get('contact_phone', 'unknown')
    logger.info(f"🎡 [WORKER] Recebido Job de Funil! Trigger ID: {trigger_id} | Phone: {phone}")

    try:
        db: Session = SessionLocal()
        try:
            # 1. Obter Trigger com Retry para visibilidade entre containers
            trigger = None
            for _ in range(5): 
                trigger = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.id == data.get("trigger_id")
                ).first()
                if trigger: break
                await asyncio.sleep(0.5)
            
            if not trigger:
                logger.error(f"❌ Trigger {data.get('trigger_id')} not found in worker")
                return

            if trigger.status == 'cancelled':
                logger.info(f"⏭️ Trigger {trigger.id} cancelado. Pulando.")
                return

            client_id = trigger.client_id
            contact_phone = data.get("contact_phone")

            # --- SUPPRESSION CHECK ---
            if trigger.integration_id and trigger.event_type:
                all_mappings = db.query(models.WebhookEventMapping).filter(
                    models.WebhookEventMapping.integration_id == trigger.integration_id,
                    models.WebhookEventMapping.is_active == True
                ).all()
                
                suppressor_types = []
                for m in all_mappings:
                    if m.cancel_events and trigger.event_type in m.cancel_events:
                        suppressor_types.append(m.event_type)
                
                if suppressor_types:
                    time_limit = datetime.now(timezone.utc) - timedelta(days=3)
                    superior_reached = db.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.integration_id == trigger.integration_id,
                        models.ScheduledTrigger.contact_phone == contact_phone,
                        models.ScheduledTrigger.product_name == trigger.product_name,
                        models.ScheduledTrigger.event_type.in_(suppressor_types),
                        models.ScheduledTrigger.status.in_(["completed", "processing"]),
                        models.ScheduledTrigger.is_bulk == False,
                        models.ScheduledTrigger.created_at >= time_limit,
                        models.ScheduledTrigger.id != trigger.id
                    ).first()
                    
                    if superior_reached:
                        logger.info(f"⏭️ [WORKER SUPPRESSION] Trigger {trigger.id} suprimido por '{superior_reached.event_type}'")
                        trigger.status = 'cancelled'
                        trigger.failure_reason = f"Suprimido por evento superior: {superior_reached.event_type}"
                        db.commit()
                        return

            db.refresh(trigger)
            conversation_id = trigger.conversation_id or data.get("conversation_id")
            chatwoot_contact_id = trigger.chatwoot_contact_id or data.get("chatwoot_contact_id")
            chatwoot_account_id = trigger.chatwoot_account_id or data.get("chatwoot_account_id")
            chatwoot_inbox_id = trigger.chatwoot_inbox_id or data.get("chatwoot_inbox_id")
            
            if not conversation_id:
                logger.info(f"⏳ Conversation ID ausente. Envio via Meta Oficial.")
            
            if not conversation_id and not contact_phone:
                logger.error(f"❌ ERRO CRÍTICO: Dados insuficientes para trigger {trigger.id}")
                trigger.status = 'failed'
                trigger.failure_reason = "Dados de contato insuficientes."
                db.commit()
                return

            funnel_id = data.get("funnel_id")
            
            if funnel_id is None:
                # Caso especial: Disparo Direto
                if trigger.template_name:
                    logger.info(f"📄 Gatilho de Template Direto: {trigger.template_name} para {contact_phone}")
                    
                    chatwoot_cl = ChatwootClient(client_id=client_id)
                    history = trigger.execution_history or []
                    already_delivered = any(h.get('node_id') == 'DELIVERY' and h.get('status') == 'completed' for h in history)
                    
                    if not already_delivered:
                        # --- SMART DISPATCH LOGIC ---
                        # Tenta enviar como Mensagem Livre se a janela de 24h estiver aberta.
                        # Caso contrário, envia o Template oficial.
                        res = None
                        window_open = False
                        
                        from services.window_manager import is_window_open_strict, get_best_conversation
                        
                        # 1. Verificar se a janela está aberta
                        if conversation_id:
                            window_open = await is_window_open_strict(client_id, contact_phone, conversation_id, db, chatwoot_cl)
                        else:
                            # Tentar descobrir uma conversa aberta via cache ou API
                            found_id = await get_best_conversation(client_id, contact_phone, 0, db, chatwoot_cl)
                            if found_id and found_id != 0:
                                conversation_id = found_id
                                window_open = True
                                logger.info(f"🎯 [SMART] Encontrada conversa aberta: {conversation_id}")

                        if window_open:
                            logger.info(f"✨ [SMART] Janela aberta para {contact_phone}! Enviando MENSAGEM LIVRE (Sessão).")
                            from models import WhatsAppTemplateCache
                            tpl = db.query(WhatsAppTemplateCache).filter(
                                WhatsAppTemplateCache.name == trigger.template_name,
                                WhatsAppTemplateCache.client_id == client_id
                            ).first()
                            
                            if tpl:
                                body = tpl.body or ""
                                contact_name = (data.get("contact_name") or trigger.contact_name or 
                                               (trigger.meta.get("sender", {}).get("name") if trigger.meta else ""))
                                if str(contact_name) == "1": contact_name = ""
                                body = render_template_body(body, trigger.template_components or [], contact_name=contact_name)
                                
                                buttons = []
                                if tpl.components:
                                    for c in tpl.components:
                                        if c.get("type") == "BUTTONS":
                                            for b in c.get("buttons", []):
                                                if b.get("type") == "QUICK_REPLY":
                                                    buttons.append(b.get("text"))
                                
                                if buttons:
                                    res = await chatwoot_cl.send_interactive_message(phone_number=contact_phone, body_text=body, buttons=buttons)
                                else:
                                    res = await chatwoot_cl.send_text_direct(phone_number=contact_phone, content=body)
                            else:
                                logger.warning(f"⚠️ Template {trigger.template_name} não encontrado.")

                        is_direct_success = False
                        if isinstance(res, dict):
                            if res.get("messages") or res.get("id") or res.get("success") is True or (not res.get("error") and res.get("messaging_product") == "whatsapp"):
                                is_direct_success = True
                            
                            if not is_direct_success:
                                err_msg = str(res.get("detail", "")).lower()
                                if "within 24 hours" in err_msg or "window" in err_msg:
                                    pass # Fallback to official
                                else:
                                    is_direct_success = True 

                        if not is_direct_success:
                            contact_name = (data.get("contact_name") or trigger.contact_name or (trigger.meta.get("sender", {}).get("name") if trigger.meta else ""))
                            if str(contact_name) == "1": contact_name = ""
                            clean_components = sanitize_template_components(trigger.template_components or [], contact_name=contact_name)
                            
                            logger.info(f"🚀 [WORKER DISPATCH] Template '{trigger.template_name}' para {contact_phone}")
                            res = await chatwoot_cl.send_template(
                                phone_number=contact_phone,
                                template_name=trigger.template_name,
                                language_code=trigger.template_language or "pt_BR",
                                components=clean_components
                            )
                        
                        if isinstance(res, dict) and res.get("error"):
                            logger.error(f"❌ Falha no disparo: {res.get('detail')}")
                            trigger.status = 'failed'
                            trigger.failure_reason = str(res.get('detail'))
                            db.commit()
                            return

                        if isinstance(res, dict) and res.get("messages"):
                            note_content = trigger.private_message or ""
                            if note_content:
                                 contact_name = (data.get("contact_name") or trigger.contact_name or (trigger.meta.get("sender", {}).get("name") if trigger.meta else ""))
                                 if str(contact_name) == "1": contact_name = ""
                                 note_content = render_template_body(note_content, trigger.template_components or [], contact_name=contact_name)
                            
                            wamid = res["messages"][0].get("id")
                            if wamid:
                                clean_wamid = wamid.replace("wamid.", "")
                                actual_type = 'FREE_MESSAGE' if is_direct_success else 'TEMPLATE'
                                new_ms = models.MessageStatus(
                                    trigger_id=trigger.id,
                                    message_id=clean_wamid,
                                    phone_number=contact_phone,
                                    status='sent',
                                    message_type=actual_type,
                                    content=f"[Livre: {trigger.template_name}]" if actual_type == 'FREE_MESSAGE' else f"[Template: {trigger.template_name}]",
                                    pending_private_note=note_content
                                )
                                db.add(new_ms)
                                trigger.sent_as = actual_type
                                trigger.total_sent = (trigger.total_sent or 0) + 1
                                db.commit() 
                        
                        log_node_execution(db, trigger, node_id='DELIVERY', status='processing', details='Aguardando confirmação...')
                        state, detail = await wait_for_delivery_sync(db, clean_wamid, trigger, current_node_id='DELIVERY')
                        
                        if state == "suspended": return 
                        if state == "failed":
                             trigger.status = 'failed'
                             trigger.failure_reason = detail
                             db.commit()
                             return
                        
                        log_node_execution(db, trigger, node_id='DELIVERY', status='completed', details='WhatsApp: Entrega confirmada!')
                    
                    db.refresh(trigger)
                    history = trigger.execution_history or []
                    stabilization_node = next((h for h in history if h.get('node_id') == 'STABILIZATION'), None)
                    
                    if not stabilization_node:
                        target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                        log_node_execution(db, trigger, node_id='STABILIZATION', status='processing', details='Estabilizando...', extra_data={"target_time": target_time})
                    
                    await asyncio.sleep(10)
                    log_node_execution(db, trigger, node_id='STABILIZATION', status='completed', details='Estabilização concluída.')
                    db.commit() 
                    
                    logger.info(f"🧬 Iniciando sincronização pós-entrega para {contact_phone}")
                    
                    if not conversation_id or not chatwoot_contact_id:
                        try:
                            from services.discovery import discover_or_create_chatwoot_conversation
                            discovery_res = await discover_or_create_chatwoot_conversation(
                                client_id=client_id,
                                phone=contact_phone,
                                name=data.get("contact_name") or trigger.contact_name
                            )
                            if discovery_res:
                                conversation_id = discovery_res.get("conversation_id")
                                chatwoot_contact_id = discovery_res.get("contact_id")
                                chatwoot_account_id = discovery_res.get("account_id")
                        except Exception as e_disc:
                            logger.error(f"❌ Discovery error: {e_disc}")
                    
                    internal_contact_id = None
                    try:
                        lead_data = {
                            "phone": contact_phone,
                            "name": data.get("contact_name") or trigger.contact_name or f"Cliente_{contact_phone}",
                            "event_type": trigger.event_type or "dispache_automático"
                        }
                        target_lead = upsert_webhook_lead(db, trigger.client_id, "zapvoice_worker", lead_data)
                        internal_contact_id = target_lead.id if target_lead else None
                        
                        if target_lead and conversation_id:
                            target_lead.chatwoot_conversation_id = conversation_id
                            target_lead.chatwoot_account_id = chatwoot_account_id
                            db.add(target_lead)
                    except Exception: pass

                    if conversation_id:
                        msg_record_to_upd = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger.id).order_by(models.MessageStatus.id.desc()).first()
                        if msg_record_to_upd:
                            msg_record_to_upd.chatwoot_conversation_id = conversation_id
                            msg_record_to_upd.chatwoot_account_id = chatwoot_account_id
                            db.add(msg_record_to_upd)
                    
                    log_node_execution(db, trigger, node_id='DISCOVERY', status='completed', details='🧬 CONTEXTO: CHATWOOT SINCRONIZADO',
                        extra_data={"account_id": chatwoot_account_id, "conversation_id": conversation_id, "contact_id": chatwoot_contact_id, "internal_contact_id": internal_contact_id})
                    db.commit() 

                    if conversation_id:
                        if getattr(trigger, 'chatwoot_label', None):
                            try:
                                cw = ChatwootClient(client_id=client_id)
                                await cw.add_label_to_conversation(conversation_id, trigger.chatwoot_label)
                            except: pass


                        msg_record = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger.id).order_by(models.MessageStatus.id.desc()).first()
                        final_mem_content = ""
                        if msg_record:
                            final_mem_content = render_template_body(
                                trigger.template_body or "", trigger.template_components or [], contact_name=trigger.contact_name,
                                var1=msg_record.var1, var2=msg_record.var2, var3=msg_record.var3, var4=msg_record.var4, var5=msg_record.var5
                            ) if trigger.template_body else msg_record.content

                        await notify_agent_memory_webhook(
                            client_id=client_id, phone=contact_phone, name=trigger.contact_name or f"Cliente_{contact_phone}",
                            template_name=trigger.template_name or "Mensagem Livre", content=final_mem_content or "[Conteúdo Indisponível]",
                            trigger_id=trigger.id, node_id="DELIVERY", internal_contact_id=internal_contact_id
                        )

                    trigger.status = 'completed'
                    db.commit()
                    logger.info(f"✅ Execução direta concluída para {contact_phone}")
                else:
                    current_convo_id = conversation_id or trigger.conversation_id
                    current_account_id = chatwoot_account_id or trigger.chatwoot_account_id
                    internal_contact_id = None
                    
                    if current_convo_id:
                        try:
                            lead_data = {"phone": contact_phone, "name": data.get("contact_name") or trigger.contact_name or f"Cliente_{contact_phone}", "event_type": trigger.event_type or "ação_interna"}
                            target_lead = upsert_webhook_lead(db, trigger.client_id, "zapvoice_worker", lead_data)
                            internal_contact_id = target_lead.id if target_lead else None
                            if target_lead:
                                target_lead.chatwoot_conversation_id = current_convo_id
                                target_lead.chatwoot_account_id = current_account_id
                                db.add(target_lead)
                        except: pass

                    log_node_execution(db, trigger, node_id='DISCOVERY', status='completed', details='🧬 CONTEXTO: CHATWOOT SINCRONIZADO',
                        extra_data={"account_id": current_account_id, "conversation_id": current_convo_id, "contact_id": chatwoot_contact_id or trigger.chatwoot_contact_id, "internal_contact_id": internal_contact_id})
                    
                    if trigger.chatwoot_label:
                        cw = ChatwootClient(client_id=client_id)
                        await cw.add_label_to_conversation(conversation_id, trigger.chatwoot_label)


                    trigger.status = 'completed'
                    db.commit()
            else:
                await execute_funnel(
                    funnel_id=funnel_id, conversation_id=conversation_id, trigger_id=data.get("trigger_id"),
                    contact_phone=contact_phone, db=db, skip_block_check=getattr(trigger, 'skip_block_check', False),
                    chatwoot_contact_id=chatwoot_contact_id, chatwoot_account_id=chatwoot_account_id, chatwoot_inbox_id=chatwoot_inbox_id
                )
            
            logger.info(f"✅ Execução de funil concluída para {contact_phone}")
        except Exception as e:
            try:
                if 'trigger' in locals() and trigger:
                    trigger.status = 'failed'
                    trigger.failure_reason = str(e)
                    db.commit()
            except: db.rollback()
            logger.error(f"❌ Erro ao executar funil (Trigger {data.get('trigger_id')}): {e}")
            raise e 
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ [WORKER CRITICAL] Erro no job de funil: {e}")

    finally:
        if MESSAGE_DELAY > 0:
            await asyncio.sleep(MESSAGE_DELAY)

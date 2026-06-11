import asyncio
import os
import json
import models
from core.logger import setup_logger
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, func, or_
from database import SessionLocal
from chatwoot_client import ChatwootClient
from services.discovery import discover_or_create_chatwoot_conversation
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from core.engine.business_hours import is_within_business_hours, get_next_business_hour_start

logger = setup_logger("Worker.WhatsApp")

# Cache em memória para evitar reprocessamento ultra-rápido do mesmo payload
GLOBAL_PROCESSING_LOCKS = {}

def normalize_phone_inbound(phone: str) -> str:
    """Normaliza o telefone de entrada para o padrão brasileiro de 13 dígitos"""
    if not phone: return phone
    cleaned = ''.join(filter(str.isdigit, str(phone)))
    
    # Se não tem o prefixo 55 e tem 10-11 dígitos, adiciona 55
    if not cleaned.startswith("55") and len(cleaned) <= 11:
        cleaned = "55" + cleaned
    
    # Se tem 55 + DDD + 8 dígitos (Total 12), adiciona o 9
    if cleaned.startswith("55") and len(cleaned) == 12:
        ddd = cleaned[2:4]
        number = cleaned[4:]
        cleaned = f"55{ddd}9{number}"
        
    return cleaned

async def handle_deferred_post_delivery(trigger_id, message_id, status, msg_id, phone):
    """
    Processa ações pós-entrega com um pequeno delay para garantir que o Chatwoot já sincronizou.
    """
    # Delay de 7 segundos para dar tempo do webhook do Chatwoot criar/vincular a conversa
    await asyncio.sleep(7)
    try:
        db = SessionLocal()
        trigger = db.query(models.ScheduledTrigger).get(trigger_id)
        if not trigger:
            logger.warning(f"⚠️ [DEFERRED_POST_DELIVERY] Trigger {trigger_id} não encontrado.")
            db.close()
            return
            
        is_bulk = False
        if trigger.is_bulk:
            is_bulk = True
        elif trigger.parent_id:
            parent_trigger = db.query(models.ScheduledTrigger).get(trigger.parent_id)
            if parent_trigger and parent_trigger.is_bulk:
                is_bulk = True

        if is_bulk:
            logger.info(f"⏭️ [DEFERRED_POST_DELIVERY] Trigger #{trigger_id} é um disparo em massa. Ignorando envio de nota privada.")
            db.close()
            return
            
        message_record = db.query(models.MessageStatus).get(message_id)
        if not message_record:
            logger.warning(f"⚠️ [DEFERRED_POST_DELIVERY] MessageStatus {message_id} não encontrado.")
            db.close()
            return

        note_text = message_record.pending_private_note
        if note_text and not message_record.private_note_posted:
            logger.info(f"📝 [DEFERRED_POST_DELIVERY] Postando nota privada pendente para {phone} (Trigger {trigger_id})")
            
            disc = await discover_or_create_chatwoot_conversation(
                client_id=trigger.client_id,
                phone=phone,
                name=trigger.contact_name or phone
            )
            
            if disc and disc.get("conversation_id"):
                conversation_id = disc["conversation_id"]
                cw = ChatwootClient(client_id=trigger.client_id)
                
                try:
                    await cw.send_private_note(conversation_id, note_text)
                    message_record.private_note_posted = True
                    message_record.chatwoot_conversation_id = conversation_id
                    message_record.chatwoot_account_id = disc.get("account_id")
                    db.commit()
                    logger.info(f"✅ [DEFERRED_POST_DELIVERY] Nota privada postada com sucesso na conversa {conversation_id}")
                except Exception as cw_err:
                    logger.error(f"❌ [DEFERRED_POST_DELIVERY] Erro ao enviar nota privada para a conversa {conversation_id}: {cw_err}")
            else:
                logger.warning(f"⚠️ [DEFERRED_POST_DELIVERY] Não foi possível encontrar/criar conversa para {phone}")
                
        db.close()
    except Exception as e:
        logger.error(f"❌ Erro no processamento adiado (Trigger {trigger_id}): {e}")

async def handle_whatsapp_event(data: dict):
    """
    Processa webhooks brutos da Meta (Status e Mensagens Inbound)
    """
    db = SessionLocal()
    
    try:
        entries = data.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                metadata = value.get("metadata", {})
                
                # 1. PROCESS STATUS UPDATES
                for status_data in value.get("statuses", []):
                    msg_id = status_data.get("id")
                    status = status_data.get("status")
                    recipient = status_data.get("recipient_id")
                    if msg_id:
                        clean_id = msg_id.replace("wamid.", "")
                        if db.bind.dialect.name == 'postgresql':
                            db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"status_{clean_id}"})
                        
                        message_record = db.query(models.MessageStatus).filter(
                            models.MessageStatus.message_id == clean_id
                        ).first()
                        
                        if not message_record and recipient:
                            recipient_norm = normalize_phone_inbound(recipient)
                            message_record = db.query(models.MessageStatus).filter(
                                models.MessageStatus.phone_number == recipient_norm,
                                models.MessageStatus.status == 'sent'
                            ).order_by(models.MessageStatus.id.desc()).first()
                            
                            if message_record:
                                logger.info(f"🔄 [STATUS_MATCH] Associando wamid {clean_id} ao MessageStatus ID {message_record.id} (anteriormente {message_record.message_id})")
                                message_record.message_id = clean_id
                                db.commit()
                        
                        if message_record:
                            trigger = db.query(models.ScheduledTrigger).get(message_record.trigger_id)
                            old_status = message_record.status
                            
                            status_priority = {'sent': 1, 'delivered': 2, 'read': 3, 'failed': 0}
                            if status_priority.get(status, 0) > status_priority.get(old_status, 0) or status == 'failed':
                                message_record.status = status
                                message_record.updated_at = datetime.now(timezone.utc)
                                
                                trigger_delivered = False
                                is_first_charge = False
                                
                                if status == 'failed':
                                    meta_errors = status_data.get("errors", [])
                                    reason = "Erro desconhecido da Meta"
                                    if meta_errors:
                                        err = meta_errors[0]
                                        reason = f"Erro Meta {err.get('code')}: {err.get('message') or err.get('title')}"
                                    message_record.failure_reason = reason
                                    pass
                                
                                if status == 'delivered' and not message_record.delivered_counted:
                                    message_record.delivered_counted = True
                                    trigger_delivered = True
                                    is_first_charge = True
                                
                                if status == 'read' and not message_record.read_counted:
                                    message_record.read_counted = True
                                    if not message_record.delivered_counted:
                                        message_record.delivered_counted = True
                                        trigger_delivered = True
                                    is_first_charge = True
                                
                                db.flush()
                                # Recalcular as estatísticas de contatos únicos
                                from services.triggers_service import reconcile_trigger_stats_logic
                                await reconcile_trigger_stats_logic(trigger.id, trigger.client_id, db)
                                if trigger.parent_id:
                                    await reconcile_trigger_stats_logic(trigger.parent_id, trigger.client_id, db)

                                if is_first_charge:
                                    # Extrair pricing da Meta
                                    pricing = status_data.get("pricing", {})
                                    category = pricing.get("category")
                                    
                                    if pricing:
                                        from routers.webhooks.dispatches import META_CATEGORY_PRICES_BRL
                                        price_brl = META_CATEGORY_PRICES_BRL.get(category, 0.0)
                                        if not pricing.get("billable", True) or category == "service":
                                            price_brl = 0.0
                                        message_record.meta_price_category = category
                                        message_record.meta_price_brl = price_brl
                                    else:
                                        if not trigger.is_free_message:
                                            price_brl = trigger.cost_per_unit or 0.35
                                            message_record.meta_price_brl = price_brl
                                            message_record.meta_price_category = "marketing"
                                        else:
                                            price_brl = 0.0
                                            message_record.meta_price_brl = 0.0
                                            message_record.meta_price_category = "service"
                                            
                                    cost_to_add = price_brl
                                    paid_increment = 1 if price_brl > 0 else 0
                                    
                                    db.execute(
                                        text("UPDATE scheduled_triggers SET total_cost = COALESCE(total_cost, 0) + :cost, total_paid_templates = COALESCE(total_paid_templates, 0) + :paid WHERE id = :tid"),
                                        {"cost": cost_to_add, "paid": paid_increment, "tid": trigger.id}
                                    )
                                    if trigger.parent_id:
                                        db.execute(
                                            text("UPDATE scheduled_triggers SET total_cost = COALESCE(total_cost, 0) + :cost, total_paid_templates = COALESCE(total_paid_templates, 0) + :paid WHERE id = :pid"),
                                            {"cost": cost_to_add, "paid": paid_increment, "pid": trigger.parent_id}
                                        )

                                # Disparar webhook de memória para qualquer template entregue.
                                # A verificação de URL configurada fica no próprio serviço ai_memory,
                                # eliminando a dependência das flags is_bulk/publish_external_event.
                                if trigger_delivered:
                                    from services.ai_memory import notify_agent_memory_webhook
                                    asyncio.create_task(notify_agent_memory_webhook(
                                        client_id=trigger.client_id,
                                        phone=message_record.phone_number,
                                        name=trigger.contact_name or message_record.phone_number,
                                        template_name=message_record.template_name or trigger.template_name or "Mensagem",
                                        content=message_record.content or "",
                                        trigger_id=trigger.id,
                                        internal_contact_id=message_record.id
                                    ))

                                db.commit()
                                logger.info(f"✅ [STATUS_UPDATE] Msg {clean_id} atualizada para {status} (Trigger {trigger.id})")
                                
                                # Publicar progresso de bulk via WebSocket em tempo real
                                trigger_to_notify = trigger
                                if trigger.parent_id:
                                    parent_trigger = db.query(models.ScheduledTrigger).get(trigger.parent_id)
                                    if parent_trigger and parent_trigger.is_bulk:
                                        trigger_to_notify = parent_trigger
                                        
                                if trigger_to_notify.is_bulk:
                                    try:
                                        db.refresh(trigger_to_notify)
                                        # Calcular queue_count via SQL real (consistente com o modal de fila)
                                        try:
                                            from sqlalchemy import func as sqlfunc
                                            ttn_id = trigger_to_notify.id
                                            subq = db.query(sqlfunc.max(models.MessageStatus.id)).filter(
                                                models.MessageStatus.trigger_id == ttn_id
                                            ).group_by(models.MessageStatus.phone_number).subquery()
                                            ws_queue_count = db.query(models.MessageStatus).filter(
                                                models.MessageStatus.id.in_(subq),
                                                models.MessageStatus.status == 'sent',
                                                models.MessageStatus.delivered_counted == False,
                                                models.MessageStatus.read_counted == False
                                            ).count()
                                        except Exception:
                                            ws_queue_count = max(0, (trigger_to_notify.total_sent or 0) - (trigger_to_notify.total_delivered or 0) - (trigger_to_notify.total_failed or 0))
                                        await rabbitmq.publish_event("bulk_progress", {
                                            "trigger_id": trigger_to_notify.id,
                                            "status": trigger_to_notify.status,
                                            "sent": trigger_to_notify.total_sent or 0,
                                            "total_sent": trigger_to_notify.total_sent or 0,
                                            "failed": trigger_to_notify.total_failed or 0,
                                            "total_failed": trigger_to_notify.total_failed or 0,
                                            "total_contacts": trigger_to_notify.total_contacts or 0,
                                            "total": trigger_to_notify.total_contacts or 0,
                                            "delivered": trigger_to_notify.total_delivered or 0,
                                            "total_delivered": trigger_to_notify.total_delivered or 0,
                                            "read": trigger_to_notify.total_read or 0,
                                            "total_read": trigger_to_notify.total_read or 0,
                                            "interactions": trigger_to_notify.total_interactions or 0,
                                            "total_interactions": trigger_to_notify.total_interactions or 0,
                                            "blocked": trigger_to_notify.total_blocked or 0,
                                            "total_blocked": trigger_to_notify.total_blocked or 0,
                                            "cost": float(trigger_to_notify.total_cost) if trigger_to_notify.total_cost else 0.0,
                                            "total_cost": float(trigger_to_notify.total_cost) if trigger_to_notify.total_cost else 0.0,
                                            "total_paid_templates": trigger_to_notify.total_paid_templates or 0,
                                            "queue_count": ws_queue_count
                                        })
                                    except Exception as ws_err:
                                        logger.error(f"⚠️ Erro ao publicar bulk_progress via WS: {ws_err}")

                                if status in ('delivered', 'read'):
                                    asyncio.create_task(handle_deferred_post_delivery(trigger.id, message_record.id, status, msg_id, recipient))
                                    
                                    if trigger.status == 'paused_waiting_delivery':
                                        # Cenário A: Gatilho de Template com Funil ZapVoice Pendente
                                        if trigger.template_name is not None and trigger.funnel_id is not None:
                                            child_exists = db.query(models.ScheduledTrigger).filter(
                                                models.ScheduledTrigger.parent_id == trigger.id
                                            ).first()
                                            
                                            if not child_exists:
                                                logger.info(f"🚀 [FUNIL-ZAPVOICE] Confirmação de entrega recebida para o trigger pai #{trigger.id}. Criando trigger do Funil ZapVoice...")
                                                # Prioridade: usar dados do MessageStatus individual (contato real do bulk)
                                                # O trigger pai num bulk tem contact_phone/contact_name do trigger pai, não do contato individual
                                                individual_phone = message_record.phone_number if message_record else trigger.contact_phone
                                                individual_name = (getattr(message_record, 'contact_name', None) if message_record else None) or trigger.contact_name or individual_phone
                                                child_trigger = models.ScheduledTrigger(
                                                    client_id=trigger.client_id,
                                                    funnel_id=trigger.funnel_id,
                                                    contact_phone=individual_phone,
                                                    contact_name=individual_name,
                                                    conversation_id=trigger.conversation_id,
                                                    chatwoot_account_id=trigger.chatwoot_account_id,
                                                    chatwoot_contact_id=trigger.chatwoot_contact_id,
                                                    chatwoot_inbox_id=trigger.chatwoot_inbox_id,
                                                    status='processing',
                                                    scheduled_time=datetime.now(timezone.utc),
                                                    is_bulk=False,
                                                    parent_id=trigger.id,
                                                    product_name="HIDDEN_CHILD",
                                                    chatwoot_label=trigger.chatwoot_label,
                                                    skip_block_check=True
                                                )
                                                db.add(child_trigger)
                                                db.commit()
                                                db.refresh(child_trigger)
                                                
                                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                                    "trigger_id": child_trigger.id,
                                                    "funnel_id": trigger.funnel_id,
                                                    "conversation_id": child_trigger.conversation_id,
                                                    "contact_phone": child_trigger.contact_phone,
                                                    "chatwoot_contact_id": child_trigger.chatwoot_contact_id,
                                                    "chatwoot_account_id": child_trigger.chatwoot_account_id,
                                                    "chatwoot_inbox_id": child_trigger.chatwoot_inbox_id
                                                })
                                                logger.info(f"📤 [FUNIL-ZAPVOICE] Funil ZapVoice #{trigger.funnel_id} iniciado para {individual_phone} ({individual_name}) via trigger filho #{child_trigger.id}")
                                            
                                            trigger.status = 'completed'
                                            db.commit()
                                            
                                        # Cenário B: Nó de Funil que estava pausado aguardando entrega
                                        elif trigger.funnel_id is not None and trigger.current_node_id is not None:
                                            logger.info(f"🔄 [RESUME] Mensagem entregue. Retomando Funil ZapVoice #{trigger.funnel_id} para {recipient}...")
                                            
                                            # Log de conclusão do nó atual
                                            current_node = trigger.current_node_id
                                            from core.engine.logging import log_node_execution
                                            log_node_execution(db, trigger, current_node, 'completed', "Mensagem entregue.")
                                            
                                            # Registrar estabilização
                                            target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                            log_node_execution(db, trigger, "STABILIZATION", "processing", "Estabilizando...", {"target_time": target_time})
                                            
                                            # Buscar o próximo nó do grafo
                                            funnel_obj = trigger.funnel
                                            if funnel_obj and funnel_obj.steps:
                                                from core.engine.utils import get_next_node
                                                graph_data = funnel_obj.steps
                                                edges = graph_data.get("edges", [])
                                                next_node_id = get_next_node(current_node, edges)
                                                
                                                if next_node_id:
                                                    trigger.current_node_id = next_node_id
                                                    trigger.status = 'processing'
                                                    db.commit()
                                                    
                                                    # Função auxiliar para retomar após 10s
                                                    async def resume_funnel_after_delay(trigger_id, funnel_id, conversation_id, phone, delay=10):
                                                        await asyncio.sleep(delay)
                                                        db_res = SessionLocal()
                                                        try:
                                                            t_res = db_res.query(models.ScheduledTrigger).get(trigger_id)
                                                            if t_res and t_res.status == 'processing':
                                                                from core.engine.logging import log_node_execution
                                                                log_node_execution(db_res, t_res, "STABILIZATION", "completed", "Estabilização concluída.")
                                                                
                                                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                                                    "trigger_id": trigger_id,
                                                                    "funnel_id": funnel_id,
                                                                    "conversation_id": conversation_id,
                                                                    "contact_phone": phone
                                                                })
                                                                logger.info(f"📤 [RESUME] Funil ZapVoice {funnel_id} retomado no nó {next_node_id} para {phone}")
                                                        except Exception as e_res:
                                                            logger.error(f"❌ [RESUME] Erro ao retomar funil: {e_res}")
                                                        finally:
                                                            db_res.close()
                                                    
                                                    asyncio.create_task(resume_funnel_after_delay(
                                                        trigger.id, funnel_obj.id, trigger.conversation_id, message_record.phone_number
                                                    ))
                                                else:
                                                    # Fim do funil
                                                    trigger.status = 'completed'
                                                    db.commit()
                                                    logger.info(f"🏁 [RESUME] Fim do Funil ZapVoice alcançado para {recipient}")
                                            else:
                                                trigger.status = 'completed'
                                                db.commit()
                                                
                                        # Cenário C: Envio de template direto sem Funil associado (Logs de compatibilidade com testes)
                                        else:
                                            current_node = trigger.current_node_id or 'DELIVERY'
                                            from core.engine.logging import log_node_execution
                                            log_node_execution(db, trigger, current_node, 'completed', "Mensagem entregue.")
                                            
                                            target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
                                            log_node_execution(db, trigger, "STABILIZATION", "processing", "Estabilizando...", {"target_time": target_time})
                                            
                                            trigger.status = 'completed'
                                            db.commit()
                                            logger.info(f"✅ [RESUME] Envio de template direto concluído para {recipient}")

                # 2. PROCESS INBOUND MESSAGES (INTERACTION)
                contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
                
                for msg in value.get("messages", []):
                    raw_from = msg.get("from")
                    from_phone = normalize_phone_inbound(raw_from)
                    msg_id = msg.get("id")
                    
                    db_lock_key = f"inbound_{from_phone}"
                    # Lock não-bloqueante para evitar travar o event loop do worker
                    if db.bind.dialect.name == 'postgresql':
                        while True:
                            locked = db.execute(text("SELECT pg_try_advisory_xact_lock(hashtext(:key))"), {"key": db_lock_key}).scalar()
                            if locked: break
                            await asyncio.sleep(0.05)
                    
                    try:
                        db.expire_all()
                        
                        # Cancelar follow-ups pendentes devido a interacao detectada no WhatsApp
                        from services.triggers_service import cancel_pending_followups_for_phone
                        cancel_pending_followups_for_phone(db, from_phone)
                        
                        mem_lock_key = f"mem_lock_{from_phone}_{msg_id}"
                        now = datetime.now(timezone.utc)
                        if mem_lock_key in GLOBAL_PROCESSING_LOCKS:
                            if now - GLOBAL_PROCESSING_LOCKS[mem_lock_key] < timedelta(seconds=10):
                                logger.warning(f"🚫 [MEM_LOCK] Ignorando mensagem repetida {msg_id}")
                                continue
                        GLOBAL_PROCESSING_LOCKS[mem_lock_key] = now

                        candidate_cids = [1]
                        pnid = metadata.get("phone_number_id")
                        if pnid:
                            confs = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).all()
                            if confs: 
                                candidate_cids = list(set([c.client_id for c in confs]))
                        
                        target_cid = candidate_cids[0] if candidate_cids else 1
                        
                        # --- NOVO: Sincronização em tempo real do ContactWindow via Meta ---
                        cw = ChatwootClient(client_id=target_cid)
                        resolved_convo_id = None
                        
                        # Verificar se este telefone está associado a um disparo em massa ativo/recente para não criar conversa fantasma
                        is_bulk_contact = False
                        try:
                            # Busca a última mensagem enviada nas últimas 2 horas para ver se veio de um bulk trigger
                            two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
                            last_msg = db.query(models.MessageStatus).filter(
                                models.MessageStatus.phone_number == from_phone,
                                models.MessageStatus.timestamp >= two_hours_ago
                            ).order_by(models.MessageStatus.timestamp.desc()).first()
                            if last_msg:
                                trigger_check = db.query(models.ScheduledTrigger).get(last_msg.trigger_id)
                                if trigger_check:
                                    if trigger_check.is_bulk:
                                        is_bulk_contact = True
                                    elif trigger_check.parent_id:
                                        parent_trigger = db.query(models.ScheduledTrigger).get(trigger_check.parent_id)
                                        if parent_trigger and parent_trigger.is_bulk:
                                            is_bulk_contact = True
                        except Exception as e_check:
                            logger.error(f"⚠️ Erro ao verificar bulk para contato {from_phone}: {e_check}")

                        try:
                            # Sincroniza conversa para garantir que ela exista no Chatwoot apenas se NÃO for contato de bulk (evitando criar conversa fantasma)
                            if not is_bulk_contact:
                                conv_res = await cw.ensure_conversation(from_phone, contacts_map.get(raw_from, "Contato"))
                                if isinstance(conv_res, dict):
                                    resolved_convo_id = conv_res.get("conversation_id")
                                elif isinstance(conv_res, int) or (isinstance(conv_res, str) and conv_res.isdigit()):
                                    resolved_convo_id = int(conv_res)
                            else:
                                logger.info(f"⏭️ [WINDOW-META] Contato {from_phone} é de disparo em massa (bulk). Pulando ensure_conversation para evitar conversa fantasma.")
                        except Exception as e_conv:
                            logger.error(f"⚠️ [WINDOW-META] Erro ao sincronizar conversa com Chatwoot: {e_conv}")

                        now_utc = datetime.now(timezone.utc)
                        window = db.query(models.ContactWindow).filter(
                            models.ContactWindow.phone == from_phone,
                            models.ContactWindow.client_id == target_cid
                        ).first()
                        
                        if window:
                            window.last_interaction_at = now_utc
                            if resolved_convo_id:
                                window.chatwoot_conversation_id = resolved_convo_id
                            logger.info(f"🕒 [WINDOW-META] Janela existente atualizada para {from_phone} (Client: {target_cid}, Convo: {resolved_convo_id})")
                        else:
                            new_window = models.ContactWindow(
                                client_id=target_cid,
                                phone=from_phone,
                                last_interaction_at=now_utc,
                                chatwoot_conversation_id=resolved_convo_id
                            )
                            db.add(new_window)
                            logger.info(f"🆕 [WINDOW-META] Nova janela criada para {from_phone} (Client: {target_cid}, Convo: {resolved_convo_id})")
                        db.commit()

                        # Sincroniza o contato na tabela customizada do cliente (ex: contatos_monitorados)
                        try:
                            from services.window_manager import sync_contact_to_custom_table
                            sender_name = contacts_map.get(raw_from, "Contato")
                            # Busca o inbox_id correspondente caso esteja disponível
                            inbox_id = None
                            if resolved_convo_id:
                                # Tenta ler o inbox_id associado da janela
                                inbox_id = window.chatwoot_inbox_id if window else None
                            
                            sync_contact_to_custom_table(
                                db=db,
                                client_id=target_cid,
                                phone=from_phone,
                                name=sender_name,
                                inbox_id=inbox_id,
                                last_interaction_at=now_utc
                            )
                        except Exception as e_sync:
                            logger.error(f"❌ Erro ao chamar sync_contact_to_custom_table no Meta Worker: {e_sync}")
                        
                        # Extrair o input do usuário (seja texto ou clique de botão)
                        user_input = None
                        msg_type = msg.get("type")
                        if msg_type == "text":
                            user_input = msg.get("text", {}).get("body")
                        elif msg_type == "button":
                            user_input = msg.get("button", {}).get("text")
                        elif msg_type == "interactive":
                            inter = msg.get("interactive", {})
                            if inter.get("type") == "button_reply":
                                user_input = inter.get("button_reply", {}).get("title")
                            elif inter.get("type") == "list_reply":
                                user_input = inter.get("list_reply", {}).get("title")

                        # --- Rastreamento de Interação em Mensagens Enviadas ---
                        context = msg.get("context", {})
                        replied_msg_id = context.get("id")
                        message_record = None
                        
                        if replied_msg_id:
                            clean_replied_id = replied_msg_id.replace("wamid.", "")
                            message_record = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == clean_replied_id).first()
                        else:
                            # FALLBACK: Se não tem context.id, buscar a última mensagem enviada para este número nas últimas 24h
                            yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
                            message_record = db.query(models.MessageStatus).filter(
                                models.MessageStatus.phone_number == from_phone,
                                models.MessageStatus.timestamp >= yesterday
                            ).order_by(models.MessageStatus.timestamp.desc()).first()

                        if message_record:
                            trigger_ref = db.query(models.ScheduledTrigger).get(message_record.trigger_id)
                            if trigger_ref:
                                target_cid = trigger_ref.client_id
                                # Se identificamos pelo histórico, ele é o candidato principal
                                if target_cid not in candidate_cids:
                                    candidate_cids.insert(0, target_cid)
                                logger.info(f"🎯 [TARGET_CID] Identificado Client {target_cid} via histórico/contexto para {from_phone}")

                        # --- Lógica de Auto-Bloqueio por Termo/Botão ---
                        is_auto_blocked = False
                        if False:
                            pass

                        if not is_auto_blocked:
                            # Apenas incrementa se for de fato um clique em botão ou resposta interativa
                            is_button_click = msg.get("type") in ["button", "interactive"]
                            
                            # --- BUTTON_ACTIONS: Funil/Bloqueio por botão configurado no disparo ---
                            action_type = None
                            if is_button_click and user_input and message_record and trigger_ref:
                                button_actions = getattr(trigger_ref, 'button_actions', None) or {}
                                # Fallback: se button_actions está nulo, buscar em trigger anterior com mesmo template
                                if not button_actions and trigger_ref.template_name:
                                    fallback_trigger = db.query(models.ScheduledTrigger).filter(
                                        models.ScheduledTrigger.client_id == trigger_ref.client_id,
                                        models.ScheduledTrigger.template_name == trigger_ref.template_name,
                                        models.ScheduledTrigger.button_actions.isnot(None)
                                    ).order_by(models.ScheduledTrigger.id.desc()).first()
                                    if fallback_trigger:
                                        button_actions = fallback_trigger.button_actions or {}
                                        logger.info(f"🔁 [BUTTON_ACTION_FALLBACK] button_actions nulo no Trigger {trigger_ref.id}, usando fallback do Trigger {fallback_trigger.id}")
                                btn_key = user_input.strip()
                                action = button_actions.get(btn_key)
                                if action and action.get("type") in ("interaction", "block"):
                                    action_type = action.get("type")

                            # Se o clique de botão for do tipo 'block', não deve incrementar total_interactions e sim apenas total_blocked (tratado na action abaixo)
                            if is_button_click and message_record and not getattr(message_record, 'interaction_counted', False):
                                message_record.interaction_counted = True
                                if action_type == "block":
                                    message_record.is_interaction = False
                                    message_record.failure_reason = 'BLOCKED_VIA_BUTTON'
                                    
                                    # Adiciona o contato na lista de exclusão/bloqueados imediatamente
                                    suffix_b = from_phone[-8:]
                                    already = db.query(models.BlockedContact).filter(
                                        models.BlockedContact.client_id == target_cid,
                                        or_(
                                            models.BlockedContact.phone == from_phone,
                                            models.BlockedContact.phone.like(f"%{suffix_b}")
                                        )
                                    ).first()
                                    if not already:
                                        db.add(models.BlockedContact(
                                            client_id=target_cid,
                                            phone=from_phone,
                                            name=contacts_map.get(raw_from, "Contato"),
                                            reason="Botão de Bloqueio (Disparo em Massa)"
                                        ))
                                    db.commit()
                                    
                                    # Recalcular estatísticas
                                    from services.triggers_service import reconcile_trigger_stats_logic
                                    await reconcile_trigger_stats_logic(message_record.trigger_id, target_cid, db)
                                    if trigger_ref.parent_id:
                                        await reconcile_trigger_stats_logic(trigger_ref.parent_id, target_cid, db)
                                        
                                    logger.info(f"🚫 [BUTTON_BLOCK_COUNT] Bloqueio imediato via botão detectado para Trigger {message_record.trigger_id} (Phone: {from_phone})")
                                else:
                                    message_record.is_interaction = True
                                    db.commit()
                                    
                                    # Recalcular estatísticas
                                    from services.triggers_service import reconcile_trigger_stats_logic
                                    await reconcile_trigger_stats_logic(message_record.trigger_id, target_cid, db)
                                    if trigger_ref.parent_id:
                                        await reconcile_trigger_stats_logic(trigger_ref.parent_id, target_cid, db)
                                        
                                    logger.info(f"👆 [INTERACTION_COUNT] Clique em botão detectado para Trigger {message_record.trigger_id} (Phone: {from_phone})")

                            if is_button_click and user_input and message_record and trigger_ref:
                                button_actions = getattr(trigger_ref, 'button_actions', None) or {}
                                # Fallback: se button_actions está nulo, buscar em trigger anterior com mesmo template
                                if not button_actions and trigger_ref.template_name:
                                    fallback_trigger = db.query(models.ScheduledTrigger).filter(
                                        models.ScheduledTrigger.client_id == trigger_ref.client_id,
                                        models.ScheduledTrigger.template_name == trigger_ref.template_name,
                                        models.ScheduledTrigger.button_actions.isnot(None)
                                    ).order_by(models.ScheduledTrigger.id.desc()).first()
                                    if fallback_trigger:
                                        button_actions = fallback_trigger.button_actions or {}
                                        logger.info(f"🔁 [BUTTON_ACTION_FALLBACK] button_actions nulo no Trigger {trigger_ref.id}, usando fallback do Trigger {fallback_trigger.id}")
                                btn_key = user_input.strip()
                                action = button_actions.get(btn_key)
                                if action and action.get("type") in ("interaction", "block"):
                                    action_type = action.get("type")
                                    action_funnel_id = action.get("funnel_id")
                                    logger.info(f"🎯 [BUTTON_ACTION] Botão '{btn_key}' → tipo={action_type} funil={action_funnel_id} para {from_phone}")

                                    async def _execute_button_action(act_type, act_funnel_id, phone, cid, convo_id, contact_name_val, block_trigger_id):
                                        import random
                                        await asyncio.sleep(random.randint(8, 12))
                                        db_btn = SessionLocal()
                                        try:
                                            if act_type == "block":
                                                suffix_b = phone[-8:]
                                                already = db_btn.query(models.BlockedContact).filter(
                                                    models.BlockedContact.client_id == cid,
                                                    or_(
                                                        models.BlockedContact.phone == phone,
                                                        models.BlockedContact.phone.like(f"%{suffix_b}")
                                                    )
                                                ).first()
                                                if not already:
                                                    db_btn.add(models.BlockedContact(
                                                        client_id=cid,
                                                        phone=phone,
                                                        name=contact_name_val or "Contato",
                                                        reason="Botão de Bloqueio (Disparo em Massa)"
                                                    ))
                                                    db_btn.commit()
                                                    logger.info(f"🚫 [BUTTON_BLOCK] Contato {phone} bloqueado via botão de disparo.")
                                                
                                                # Atualizar o status da mensagem original para registrar o bloqueio no histórico
                                                msg_rec = db_btn.query(models.MessageStatus).filter(
                                                    models.MessageStatus.trigger_id == block_trigger_id,
                                                    models.MessageStatus.phone_number == phone
                                                ).first()
                                                if msg_rec:
                                                    msg_rec.failure_reason = 'BLOCKED_VIA_BUTTON'
                                                    db_btn.commit()

                                            if act_funnel_id:
                                                new_t = models.ScheduledTrigger(
                                                    client_id=cid,
                                                    funnel_id=act_funnel_id,
                                                    conversation_id=convo_id,
                                                    contact_phone=phone,
                                                    contact_name=contact_name_val or phone,
                                                    status='processing',
                                                    scheduled_time=datetime.now(timezone.utc),
                                                    is_bulk=False,
                                                    is_interaction=(act_type == "interaction"),
                                                    skip_block_check=(act_type == "block"),
                                                    parent_id=block_trigger_id
                                                )
                                                db_btn.add(new_t)
                                                db_btn.commit()
                                                db_btn.refresh(new_t)
                                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                                    "trigger_id": new_t.id,
                                                    "funnel_id": act_funnel_id,
                                                    "conversation_id": convo_id,
                                                    "contact_phone": phone
                                                })
                                                logger.info(f"🚀 [BUTTON_ACTION_FUNNEL] Funil {act_funnel_id} iniciado para {phone} (tipo={act_type})")
                                        except Exception as e_btn:
                                            logger.error(f"❌ [BUTTON_ACTION] Erro ao executar ação do botão para {phone}: {e_btn}")
                                        finally:
                                            db_btn.close()

                                    asyncio.create_task(_execute_button_action(
                                        action_type,
                                        action_funnel_id,
                                        from_phone,
                                        target_cid,
                                        resolved_convo_id,
                                        contacts_map.get(raw_from, "Contato"),
                                        message_record.trigger_id
                                    ))
                                    continue

                        # --- [REATIVADO] GATILHO DE FUNIL VIA META ---
                        if user_input:
                            # --- Verificar se o contato possui um funil pausado em botões ---
                            # Usa sufixo de 8 dígitos para tolerância de variações do 9° dígito brasileiro
                            phone_suffix_sus = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                            suspended_trigger = db.query(models.ScheduledTrigger).filter(
                                models.ScheduledTrigger.client_id == target_cid,
                                or_(
                                    models.ScheduledTrigger.contact_phone == from_phone,
                                    models.ScheduledTrigger.contact_phone.like(f"%{phone_suffix_sus}")
                                ),
                                models.ScheduledTrigger.status == "suspended",
                                models.ScheduledTrigger.current_node_id != None
                            ).order_by(models.ScheduledTrigger.updated_at.desc()).first()

                            if not suspended_trigger:
                                logger.info(f"🔍 [WA-RESUME] Nenhum funil suspenso encontrado para {from_phone} (client {target_cid}, sufixo {phone_suffix_sus})")

                            if suspended_trigger:
                                logger.info(f"⏸️ [WA-RESUME] Funil suspenso encontrado: Trigger #{suspended_trigger.id} | Funil #{suspended_trigger.funnel_id} | Nó atual: {suspended_trigger.current_node_id}")
                                funnel_obj = suspended_trigger.funnel
                                if funnel_obj and funnel_obj.steps:
                                    graph_data = funnel_obj.steps
                                    nodes = {str(n["id"]): n for n in graph_data.get("nodes", [])}
                                    edges = graph_data.get("edges", [])

                                    current_node = nodes.get(suspended_trigger.current_node_id)
                                    if not current_node:
                                        logger.warning(f"⚠️ [WA-RESUME] Nó {suspended_trigger.current_node_id} não encontrado no grafo. Nós disponíveis: {list(nodes.keys())}")
                                    
                                    node_type = current_node.get("type") if current_node else None
                                    if current_node and node_type in ["message", "messageNode", "inputDataNode", "input_data"]:
                                        target_node_id = None
                                        
                                        if node_type in ["inputDataNode", "input_data"]:
                                            # Processar validação e extração de dados
                                            node_data = current_node.get("data", {})
                                            var_name = node_data.get("varName")
                                            error_message = node_data.get("errorMessage")
                                            if not error_message or not error_message.strip():
                                                error_message = "Entrada inválida. Digite novamente."
                                            
                                            import re
                                            from services.input_data_parser import parse_and_extract_input_data, generate_ai_error_message
                                            is_valid, extracted_val = await parse_and_extract_input_data(
                                                db=db,
                                                user_input=user_input,
                                                node_data=node_data,
                                                client_id=target_cid,
                                                trigger=suspended_trigger
                                            )
                                                    
                                            if is_valid:
                                                # Salvar variável na trigger (se existir a coluna)
                                                if not hasattr(suspended_trigger, 'processed_data') or suspended_trigger.processed_data is None:
                                                    suspended_trigger.processed_data = {}
                                                suspended_trigger.processed_data[var_name] = extracted_val
                                                from sqlalchemy.orm.attributes import flag_modified
                                                flag_modified(suspended_trigger, "processed_data")
                                                
                                                # Extrair e salvar a variável também no WebhookLead do contato correspondente
                                                phone_suffix = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                                                lead = db.query(models.WebhookLead).filter(
                                                    models.WebhookLead.client_id == target_cid,
                                                    or_(
                                                        models.WebhookLead.phone == from_phone,
                                                        models.WebhookLead.phone.like(f"%{phone_suffix}")
                                                    )
                                                ).first()
                                                
                                                if lead:
                                                    if lead.variables is None:
                                                        lead.variables = {}
                                                    lead.variables[var_name] = extracted_val
                                                    flag_modified(lead, "variables")
                                                    logger.info(f"💾 [WA-RESUME-INPUT] Variável '{var_name}' salva com valor '{extracted_val}' no WebhookLead ID {lead.id}")
                                                else:
                                                    logger.warning(f"⚠️ [WA-RESUME-INPUT] WebhookLead não encontrado para o telefone {from_phone} para salvar a variável '{var_name}'")
                                                
                                                # Seguir pela porta default/sucesso
                                                edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and (not e.get("sourceHandle") or e.get("sourceHandle") == "default" or e.get("sourceHandle") == "success")), None)
                                                if edge:
                                                    target_node_id = edge.get("target")
                                                    logger.info(f"✅ [WA-RESUME-INPUT] Entrada válida. Avançando para o Nó {target_node_id}")
                                            else:
                                                if node_data.get("errorByAi"):
                                                    logger.info(f"🧠 [WA-RESUME-INPUT] Erro por IA ativado. Solicitando geração de erro...")
                                                    error_message = await generate_ai_error_message(user_input, node_data, target_cid)
                                                elif node_data.get("validationRule") == "cpf":
                                                    nums = re.sub(r"\D", "", user_input)
                                                    if len(nums) != 11:
                                                        error_message = f"O CPF enviado está inválido pois possui {len(nums)} dígitos, mas um CPF deve ter exatamente 11 dígitos. Por favor, envie os 11 dígitos do seu CPF. 😊"

                                                logger.info(f"❌ [WA-RESUME-INPUT] Entrada inválida. Enviando mensagem de erro: {error_message}")
                                                # Enviar mensagem de erro
                                                if resolved_convo_id and int(resolved_convo_id) > 0:
                                                    await cw.send_message(resolved_convo_id, error_message)
                                                else:
                                                    await cw.send_text_official(from_phone, error_message)
                                                # Continuar no mesmo nó (manter suspenso)
                                                continue
                                        else:
                                            # Nó de Mensagem comum
                                            buttons = [b.strip() for b in current_node.get("data", {}).get("buttons", []) if b.strip()]
                                            logger.info(f"🔘 [WA-RESUME] Botões do nó: {buttons} | Input do usuário: '{user_input}'")
                                            
                                            source_handle = None
                                            input_clean = user_input.strip().lower()
                                            matched_btn_idx = -1
                                            for idx, btn_text in enumerate(buttons):
                                                if btn_text.strip().lower() == input_clean:
                                                    matched_btn_idx = idx
                                                    break
                                                    
                                            if matched_btn_idx != -1:
                                                # Seguir a conexão do botão específico
                                                source_handle = f"button_{matched_btn_idx}"
                                                edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and e.get("sourceHandle") == source_handle), None)
                                                if edge:
                                                    target_node_id = edge.get("target")
                                                    logger.info(f"👆 [WA-RESUME] Clique em botão '{user_input}' (índice {matched_btn_idx}) mapeado para o Nó {target_node_id}")
                                            else:
                                                # Tenta seguir o caminho padrão (sem sourceHandle ou default)
                                                edge = next((e for e in edges if e.get("source") == suspended_trigger.current_node_id and (not e.get("sourceHandle") or e.get("sourceHandle") == "default" or not str(e.get("sourceHandle", "")).startswith("button_"))), None)
                                                if edge:
                                                    target_node_id = edge.get("target")
                                                    logger.info(f"💬 [WA-RESUME] Resposta de texto/desconhecida '{user_input}' mapeada para o caminho padrão (Nó {target_node_id})")

                                        if target_node_id:
                                            # Verificar se o nó de destino tem horário comercial ativo e estamos fora do horário
                                            is_outside_hours = False
                                            target_node = nodes.get(target_node_id)
                                            if target_node:
                                                target_data = target_node.get("data", {})
                                                if target_data.get("onlyBusinessHours") and not is_within_business_hours(funnel_obj):
                                                    is_outside_hours = True

                                            if is_outside_hours:
                                                next_run = get_next_business_hour_start(funnel_obj)
                                                suspended_trigger.current_node_id = target_node_id
                                                suspended_trigger.status = "queued"
                                                suspended_trigger.scheduled_time = next_run
                                                db.commit()
                                                logger.info(f"⏳ [WA-RESUME] Fora do horário comercial. Agendando Funil {funnel_obj.id} ({funnel_obj.name}) para {next_run} no nó {target_node_id}")
                                            else:
                                                suspended_trigger.current_node_id = target_node_id
                                                suspended_trigger.status = "processing"
                                                suspended_trigger.scheduled_time = datetime.now(timezone.utc)
                                                db.commit()
                                                
                                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                                    "trigger_id": suspended_trigger.id,
                                                    "funnel_id": funnel_obj.id,
                                                    "conversation_id": resolved_convo_id or suspended_trigger.conversation_id,
                                                    "contact_phone": from_phone
                                                })
                                                logger.info(f"🔄 [WA-RESUME] Retomando Funil {funnel_obj.id} ({funnel_obj.name}) para {from_phone} no nó {target_node_id}")
                                            continue

                            # Lógica de gatilho por palavra-chave (trigger_phrase) desativada conforme solicitação
                            logger.info(f"ℹ️ [WA-TRIGGER] Gatilho por palavra-chave desativado. Ignorando input '{user_input}' para novos funis.")
                        # ---------------------------------------------

                    except Exception as e_inner:
                        logger.error(f"❌ Erro ao processar mensagem individual: {e_inner}")
                        db.rollback()
                    finally:
                        # pg_advisory_xact_lock libera automaticamente no commit/rollback
                        db.commit()

    except Exception as e:
        logger.error(f"❌ Erro crítico no handler de WhatsApp: {e}")
        db.rollback()
    finally:
        db.close()

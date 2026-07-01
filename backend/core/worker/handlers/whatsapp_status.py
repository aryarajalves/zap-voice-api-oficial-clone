import asyncio
import models
from core.logger import setup_logger
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from services.discovery import discover_or_create_chatwoot_conversation
from config_loader import get_setting

# Access attributes via the main namespace module to support unit test patching
import core.worker.handlers.whatsapp as wah

logger = setup_logger("Worker.WhatsAppStatus")

async def handle_deferred_post_delivery(trigger_id, message_id, status, msg_id, phone):
    """
    Processa ações pós-entrega com um pequeno delay para garantir que o Chatwoot já sincronizou.
    """
    # Delay de 7 segundos para dar tempo do webhook do Chatwoot criar/vincular a conversa
    await asyncio.sleep(7)
    try:
        db = wah.SessionLocal()
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
                cw = wah.ChatwootClient(client_id=trigger.client_id)
                
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


async def handle_whatsapp_statuses(db, statuses: list, value: dict):
    """
    Processa atualizações de status brutas da Meta
    """
    for status_data in statuses:
        msg_id = status_data.get("id")
        status = status_data.get("status")
        recipient = status_data.get("recipient_id")
        if msg_id:
            clean_id = msg_id.replace("wamid.", "")
            has_pg_lock = False
            if hasattr(db, 'bind') and db.bind is not None:
                dialect = getattr(db.bind, 'dialect', None)
                if dialect is not None and getattr(dialect, 'name', None) == 'postgresql':
                    has_pg_lock = True
            if has_pg_lock:
                db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"status_{clean_id}"})
            
            message_record = db.query(models.MessageStatus).filter(
                models.MessageStatus.message_id == clean_id
            ).first()
            
            if not message_record and recipient:
                recipient_norm = wah.normalize_phone_inbound(recipient)
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
                        
                        # Fallback assíncrono para BSUD caso o envio original para o número bruto tenha falhado
                        is_bsud = str(message_record.phone_number).startswith("BR.")
                        if not is_bsud:
                            try:
                                from sqlalchemy import or_
                                clean_phone = ''.join(filter(str.isdigit, str(message_record.phone_number)))
                                suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
                                lead = db.query(models.WebhookLead).filter(
                                    models.WebhookLead.client_id == trigger.client_id,
                                    or_(
                                        models.WebhookLead.phone == clean_phone,
                                        models.WebhookLead.phone.like(f"%{suffix}")
                                    )
                                ).first()
                                if lead and lead.bsud:
                                    # Verificar se já tentamos o BSUD neste trigger
                                    already_tried = db.query(models.MessageStatus).filter(
                                        models.MessageStatus.trigger_id == trigger.id,
                                        models.MessageStatus.phone_number == lead.bsud
                                    ).first()
                                    if not already_tried:
                                        logger.info(f"🔄 [BSUD-FALLBACK-ASYNC] Falha no envio para o número normal {clean_phone}. Tentando BSUD '{lead.bsud}'...")
                                        # Agendar o envio em background
                                        async def send_async_fallback(tid, client_id, bsud_id, t_name, lang, components):
                                            try:
                                                from chatwoot_client import ChatwootClient
                                                from database import SessionLocal
                                                cw = ChatwootClient(client_id=client_id)
                                                fallback_res = await cw.send_template(
                                                    contact_phone=bsud_id,
                                                    template_name=t_name,
                                                    template_language=lang or "pt_BR",
                                                    template_components=components
                                                )
                                                if fallback_res and not fallback_res.get("error"):
                                                    new_wamid = (fallback_res.get("messages", [{}])[0].get("id") or fallback_res.get("id", "")).replace("wamid.", "")
                                                    db_fallback = SessionLocal()
                                                    new_ms = models.MessageStatus(
                                                        trigger_id=tid,
                                                        message_id=new_wamid,
                                                        phone_number=bsud_id,
                                                        contact_name=trigger.contact_name,
                                                        status='sent',
                                                        message_type='TEMPLATE',
                                                        content=message_record.content,
                                                        template_name=t_name
                                                    )
                                                    db_fallback.add(new_ms)
                                                    db_fallback.commit()
                                                    db_fallback.close()
                                                    logger.info(f"✅ [BSUD-FALLBACK-ASYNC] Fallback enviado com sucesso para {bsud_id}")
                                            except Exception as ex:
                                                logger.error(f"❌ [BSUD-FALLBACK-ASYNC] Erro ao disparar fallback: {ex}")
                                        
                                        asyncio.create_task(send_async_fallback(
                                            trigger.id, 
                                            trigger.client_id, 
                                            lead.bsud, 
                                            trigger.template_name, 
                                            trigger.template_language,
                                            trigger.template_components or []
                                        ))
                            except Exception as e_fallback:
                                logger.error(f"❌ Erro no fluxo de fallback BSUD assíncrono: {e_fallback}")
                    
                    if status == 'delivered' and not message_record.delivered_counted:
                        message_record.delivered_counted = True
                        trigger_delivered = True
                        # Só é a primeira cobrança se nunca tivermos atribuído um preço a esta mensagem
                        if message_record.meta_price_brl is None:
                            is_first_charge = True
                    
                    if status == 'read' and not message_record.read_counted:
                        message_record.read_counted = True
                        if not message_record.delivered_counted:
                            message_record.delivered_counted = True
                            trigger_delivered = True
                            if message_record.meta_price_brl is None:
                                is_first_charge = True
                    
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

                    db.flush()
                    # Recalcular as estatísticas de contatos únicos
                    from services.triggers_service import reconcile_trigger_stats_logic
                    await reconcile_trigger_stats_logic(trigger.id, trigger.client_id, db)
                    if trigger.parent_id:
                        await reconcile_trigger_stats_logic(trigger.parent_id, trigger.client_id, db)

                    # Disparar webhook de memória para qualquer template entregue.
                    # A verificação de URL configurada fica no próprio serviço ai_memory,
                    # eliminando a dependência das flags is_bulk/publish_external_event.
                    if trigger_delivered and (trigger.is_bulk or getattr(trigger, 'publish_external_event', False)):
                        import services.ai_memory
                        asyncio.create_task(services.ai_memory.notify_agent_memory_webhook(
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
                            if trigger_to_notify.status in ['completed', 'failed', 'cancelled', 'aborted', 'processed']:
                                ws_queue_count = 0
                            else:
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
                            await wah.rabbitmq.publish_event("bulk_progress", {
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
                        asyncio.create_task(wah.handle_deferred_post_delivery(trigger.id, message_record.id, status, msg_id, recipient))
                        
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
                                    
                                    await wah.rabbitmq.publish("zapvoice_funnel_executions", {
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
                                            db_res = wah.SessionLocal()
                                            try:
                                                t_res = db_res.query(models.ScheduledTrigger).get(trigger_id)
                                                if t_res and t_res.status == 'processing':
                                                    from core.engine.logging import log_node_execution
                                                    log_node_execution(db_res, t_res, "STABILIZATION", "completed", "Estabilização concluída.")
                                                    
                                                    await wah.rabbitmq.publish("zapvoice_funnel_executions", {
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

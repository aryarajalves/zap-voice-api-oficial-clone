import logging
import asyncio
import os
import json
import models
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, func, or_
from database import SessionLocal
from chatwoot_client import ChatwootClient
from services.discovery import discover_or_create_chatwoot_conversation
from rabbitmq_client import rabbitmq
from config_loader import get_setting

logger = logging.getLogger("Worker.WhatsApp")

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
    await asyncio.sleep(2)
    try:
        db = SessionLocal()
        trigger = db.query(models.ScheduledTrigger).get(trigger_id)
        if not trigger:
            db.close()
            return
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
                        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"status_{clean_id}"})
                        
                        message_record = db.query(models.MessageStatus).filter(
                            models.MessageStatus.message_id == clean_id
                        ).first()
                        
                        if message_record:
                            trigger = db.query(models.ScheduledTrigger).get(message_record.trigger_id)
                            old_status = message_record.status
                            
                            status_priority = {'sent': 1, 'delivered': 2, 'read': 3, 'failed': 0}
                            if status_priority.get(status, 0) > status_priority.get(old_status, 0) or status == 'failed':
                                message_record.status = status
                                message_record.updated_at = datetime.now(timezone.utc)
                                
                                trigger_delivered = False
                                if status == 'delivered' and not message_record.delivered_counted:
                                    message_record.delivered_counted = True
                                    db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})
                                    trigger_delivered = True
                                
                                if status == 'read' and not message_record.read_counted:
                                    message_record.read_counted = True
                                    if not message_record.delivered_counted:
                                        message_record.delivered_counted = True
                                        db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})
                                        trigger_delivered = True
                                    db.execute(text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})

                                if trigger_delivered and trigger.is_bulk:
                                    from services.ai_memory import notify_agent_memory_webhook
                                    asyncio.create_task(notify_agent_memory_webhook(
                                        client_id=trigger.client_id,
                                        phone=message_record.phone_number,
                                        name=trigger.contact_name or message_record.phone_number,
                                        template_name=message_record.template_name or trigger.template_name or "Mensagem Bulk",
                                        content=message_record.content or "",
                                        trigger_id=trigger.id,
                                        internal_contact_id=message_record.id
                                    ))

                                db.commit()
                                logger.info(f"✅ [STATUS_UPDATE] Msg {clean_id} atualizada para {status} (Trigger {trigger.id})")
                                
                                if status in ['delivered', 'read']:
                                    asyncio.create_task(handle_deferred_post_delivery(trigger.id, message_record.id, status, msg_id, recipient))

                # 2. PROCESS INBOUND MESSAGES (INTERACTION)
                contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
                
                for msg in value.get("messages", []):
                    raw_from = msg.get("from")
                    from_phone = normalize_phone_inbound(raw_from)
                    msg_id = msg.get("id")
                    
                    db_lock_key = f"inbound_{from_phone}"
                    # Lock não-bloqueante para evitar travar o event loop do worker
                    while True:
                        locked = db.execute(text("SELECT pg_try_advisory_xact_lock(hashtext(:key))"), {"key": db_lock_key}).scalar()
                        if locked: break
                        await asyncio.sleep(0.05)
                    
                    try:
                        db.expire_all()
                        
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
                        
                        # --- NOVO: Rastreamento de Interação em Mensagens Enviadas ---
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

                            if not getattr(message_record, 'interaction_counted', False):
                                message_record.interaction_counted = True
                                message_record.is_interaction = True
                                db.execute(text("UPDATE scheduled_triggers SET total_interactions = COALESCE(total_interactions, 0) + 1 WHERE id = :tid"), {"tid": message_record.trigger_id})
                                db.commit()
                                logger.info(f"👆 [INTERACTION_COUNT] Clique detectado para Trigger {message_record.trigger_id} (Phone: {from_phone})")
                        # ----------------------------------------------------------

                        # --- [REATIVADO] GATILHO DE FUNIL VIA META ---
                        # Voltamos a processar aqui porque o webhook do Chatwoot pode falhar ou atrasar.
                        # O engine de execução (executor.py) já cuida de sincronizar com o Chatwoot via ensure_conversation.
                        
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

                        if user_input:
                            text_clean = user_input.strip().lower()
                            matched_funnel = db.query(models.Funnel).filter(
                                models.Funnel.client_id.in_(candidate_cids),
                                models.Funnel.is_active == True,
                                or_(
                                    func.lower(models.Funnel.trigger_phrase) == text_clean,
                                    models.Funnel.trigger_phrase.ilike(f"%,{text_clean},%"),
                                    models.Funnel.trigger_phrase.ilike(f"{text_clean},%"),
                                    models.Funnel.trigger_phrase.ilike(f"%,{text_clean}")
                                )
                            ).first()

                            if matched_funnel:
                                parent_id = None
                                # Tenta pegar o parent_id se foi uma resposta a uma mensagem rastreada
                                try:
                                    if 'trigger_ref' in locals() and trigger_ref:
                                        parent_id = trigger_ref.id
                                except: pass

                                new_trigger = models.ScheduledTrigger(
                                    client_id=target_cid,
                                    funnel_id=matched_funnel.id,
                                    contact_phone=from_phone,
                                    contact_name=contacts_map.get(raw_from, "Contato"),
                                    status='processing',
                                    scheduled_time=datetime.now(timezone.utc),
                                    is_bulk=False,
                                    is_interaction=True,
                                    parent_id=parent_id
                                )
                                db.add(new_trigger)
                                db.commit()
                                db.refresh(new_trigger)

                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                    "trigger_id": new_trigger.id,
                                    "funnel_id": matched_funnel.id,
                                    "contact_phone": from_phone
                                })
                                logger.info(f"🚀 [WA-TRIGGER] Funil {matched_funnel.id} ({matched_funnel.name}) iniciado para {from_phone} via Meta (Parent: {parent_id})")
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

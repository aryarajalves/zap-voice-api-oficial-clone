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
                                
                                if status == 'delivered' and not message_record.delivered_counted:
                                    message_record.delivered_counted = True
                                    db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})
                                
                                if status == 'read' and not message_record.read_counted:
                                    message_record.read_counted = True
                                    if not message_record.delivered_counted:
                                        message_record.delivered_counted = True
                                        db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})
                                    db.execute(text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})

                                db.commit()
                                
                                if status in ['delivered', 'read']:
                                    asyncio.create_task(handle_deferred_post_delivery(trigger.id, message_record.id, status, msg_id, recipient))

                # 2. PROCESS INBOUND MESSAGES (INTERACTION)
                contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
                
                for msg in value.get("messages", []):
                    raw_from = msg.get("from")
                    from_phone = normalize_phone_inbound(raw_from)
                    msg_id = msg.get("id")
                    
                    db_lock_key = f"inbound_{from_phone}"
                    db.execute(text("SELECT pg_advisory_lock(hashtext(:key))"), {"key": db_lock_key})
                    
                    try:
                        db.expire_all()
                        
                        mem_lock_key = f"mem_lock_{from_phone}_{msg_id}"
                        now = datetime.now(timezone.utc)
                        if mem_lock_key in GLOBAL_PROCESSING_LOCKS:
                            if now - GLOBAL_PROCESSING_LOCKS[mem_lock_key] < timedelta(seconds=10):
                                logger.warning(f"🚫 [MEM_LOCK] Ignorando mensagem repetida {msg_id}")
                                continue
                        GLOBAL_PROCESSING_LOCKS[mem_lock_key] = now

                        target_cid = 1
                        pnid = metadata.get("phone_number_id")
                        if pnid:
                            conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                            if conf: target_cid = conf.client_id
                        
                        # Nome sugerido pela Meta (se existir)
                        meta_profile_name = contacts_map.get(raw_from) or "Contato"
                        
                        user_input = ""
                        if msg.get("type") == "text": user_input = msg.get("text", {}).get("body", "")
                        elif msg.get("type") == "interactive":
                            user_input = msg.get("interactive", {}).get("button_reply", {}).get("title") or \
                                         msg.get("interactive", {}).get("list_reply", {}).get("title", "")
                        
                        user_input_clean = user_input.strip().lower()
                        
                        matched_funnel = db.query(models.Funnel).filter(
                            models.Funnel.client_id == target_cid,
                            or_(
                                func.lower(models.Funnel.trigger_phrase) == user_input_clean,
                                models.Funnel.trigger_phrase.ilike(f"%,{user_input_clean},%"),
                                models.Funnel.trigger_phrase.ilike(f"{user_input_clean},%"),
                                models.Funnel.trigger_phrase.ilike(f"%,{user_input_clean}")
                            )
                        ).first()
                        
                        if matched_funnel:
                            existing = db.query(models.ScheduledTrigger).filter(
                                models.ScheduledTrigger.client_id == target_cid,
                                models.ScheduledTrigger.idempotency_key == msg_id
                            ).first()
                            
                            if existing:
                                logger.info(f"🚫 [IDEMPOTENCY] Trigger já existe para interação {msg_id}. Pulando.")
                                continue
                            
                            # Tenta descobrir o contato no Chatwoot para pegar o nome real
                            disc_res = await discover_or_create_chatwoot_conversation(target_cid, from_phone, meta_profile_name)
                            conv_id = disc_res.get("conversation_id") if disc_res else None
                            # Se o discovery encontrou um nome melhor (do Chatwoot), usamos ele
                            final_name = disc_res.get("contact_name") if disc_res else meta_profile_name
                            
                            if conv_id:
                                new_trigger = models.ScheduledTrigger(
                                    client_id=target_cid,
                                    funnel_id=matched_funnel.id,
                                    contact_phone=from_phone,
                                    contact_name=final_name,
                                    conversation_id=conv_id,
                                    status='processing',
                                    scheduled_time=datetime.now(timezone.utc),
                                    is_bulk=False,
                                    is_interaction=True,
                                    idempotency_key=msg_id
                                )
                                db.add(new_trigger)
                                db.commit()
                                db.refresh(new_trigger)
                                
                                await rabbitmq.publish("zapvoice_funnel_executions", {
                                    "trigger_id": new_trigger.id,
                                    "funnel_id": matched_funnel.id,
                                    "contact_phone": from_phone,
                                    "conversation_id": conv_id
                                })
                                logger.info(f"🚀 [INTERACTION] Funil {matched_funnel.id} disparado para {from_phone} ({final_name})")

                    except Exception as e_inner:
                        logger.error(f"❌ Erro ao processar mensagem individual: {e_inner}")
                        db.rollback()
                    finally:
                        db.execute(text("SELECT pg_advisory_unlock(hashtext(:key))"), {"key": db_lock_key})
                        db.commit()

    except Exception as e:
        logger.error(f"❌ Erro crítico no handler de WhatsApp: {e}")
        db.rollback()
    finally:
        db.close()

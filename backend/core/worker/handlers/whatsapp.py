import asyncio
import logging
import json
import models
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, or_, and_, func
from database import SessionLocal
from chatwoot_client import ChatwootClient
from config_loader import get_setting
from rabbitmq_client import rabbitmq
from services.ai_memory import notify_ai_memory, notify_agent_memory_webhook
from services.engine import log_node_execution
from services.bulk import render_template_body
from utils import normalize_phone
from .chatwoot import delayed_sync_chatwoot_name
from ..utils import update_node_history_extra, update_node_memory_status

logger = logging.getLogger("Worker.WhatsApp")

async def handle_whatsapp_event(data: dict):
    """
    Processa eventos crus do Webhook da Meta.
    """
    try:
        entry = data.get("entry", [])
        if not entry: return

        db = SessionLocal()
        return_config = db.query(models.AppConfig).filter(models.AppConfig.key == "META_RETURN_CONFIG").first()
        return_url = return_config.value if return_config else None
        processed_events = []

        for item in entry:
            changes = item.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", []) if c.get("wa_id") and c.get("profile", {}).get("name")}

                # 1. STATUS UPDATE
                for status_obj in value.get("statuses", []):
                    msg_id, status, recipient = status_obj.get("id"), status_obj.get("status"), status_obj.get("recipient_id")
                    if not msg_id or not status: continue
                    
                    clean_msg_id = msg_id.replace("wamid.", "")
                    message_record = None
                    for attempt in range(10):
                        message_record = db.query(models.MessageStatus).filter((models.MessageStatus.message_id == clean_msg_id) | (models.MessageStatus.message_id == msg_id)).with_for_update().first()
                        if message_record: break
                        if attempt < 9:
                            await asyncio.sleep(0.5)
                            db.rollback()

                    if not message_record:
                        db.rollback()
                        message_record = db.query(models.MessageStatus).filter((models.MessageStatus.message_id == clean_msg_id) | (models.MessageStatus.message_id == msg_id)).first()
                        if not message_record:
                            try:
                                recipient_clean = "".join(filter(str.isdigit, str(recipient)))
                                if recipient_clean:
                                    suffix_8 = recipient_clean[-8:]
                                    message_record = db.query(models.MessageStatus).filter(models.MessageStatus.phone_number.like(f"%{suffix_8}"), models.MessageStatus.timestamp >= datetime.now(timezone.utc) - timedelta(minutes=15)).order_by(models.MessageStatus.timestamp.desc()).first()
                            except: pass

                    if message_record:
                        STATUS_PRIORITY = {'failed': 100, 'read': 30, 'delivered': 20, 'sent': 10}
                        old_status = message_record.status
                        if old_status != status and STATUS_PRIORITY.get(status, 0) >= STATUS_PRIORITY.get(old_status, 0):
                            message_record.status, message_record.updated_at = status, datetime.now(timezone.utc)
                            if status == "failed" and status_obj.get("errors"):
                                message_record.failure_reason = f"{status_obj['errors'][0].get('code')}: {status_obj['errors'][0].get('title')}"
                            
                            trigger = message_record.trigger
                            if trigger:
                                is_first_delivery = status in ['delivered', 'read'] and old_status not in ['delivered', 'read']
                                if is_first_delivery:
                                    META_PRICES = {"marketing": 0.35, "utility": 0.07, "service": 0.0, "authentication": 0.15}
                                    pricing = status_obj.get("pricing", {})
                                    meta_cat = pricing.get("category", "").lower()
                                    cost = 0.0 if message_record.message_type == 'FREE_MESSAGE' else (trigger.cost_per_unit or META_PRICES.get(meta_cat, 0.0))
                                    if meta_cat: message_record.meta_price_category = meta_cat
                                    if cost > 0: message_record.meta_price_brl = cost
                                    
                                    db.flush()
                                    db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1, total_cost = COALESCE(total_cost, 0) + :cost, total_paid_templates = COALESCE(total_paid_templates, 0) + :paid WHERE id = :tid"), {"tid": trigger.id, "cost": cost, "paid": 1 if cost > 0 else 0})
                                    db.refresh(trigger)

                                    # Logs de progresso removidos para evitar conflito com contagem do funil

                                    if message_record.content:
                                        msg_type = "template" if "[Template:" in message_record.content else "text"
                                        await notify_ai_memory(client_id=trigger.client_id, phone=message_record.phone_number, content=message_record.content, msg_type=msg_type, direction="outgoing")

                                if status == 'read' and old_status != 'read':
                                    db.execute(text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})

                                if status == 'failed' and old_status != 'failed':
                                    db.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})
                                    if old_status == 'sent': db.execute(text("UPDATE scheduled_triggers SET total_sent = GREATEST(0, COALESCE(total_sent, 0) - 1) WHERE id = :tid"), {"tid": trigger.id})

                            db.commit()
                            if trigger and status in ['delivered', 'read']:
                                asyncio.create_task(handle_deferred_post_delivery(trigger.id, message_record.id, status, msg_id, recipient))
                            
                            processed_events.append({"type": "status", "phone": recipient, "status": status, "message_id": msg_id, "trigger_id": trigger.id if trigger else None})

                # 2. INTERACTION
                for msg in value.get("messages", []):
                    msg_type, from_phone = msg.get("type"), msg.get("from")
                    profile_name = contacts_map.get(from_phone)
                    if profile_name:
                        pnid = value.get("metadata", {}).get("phone_number_id")
                        target_cid = 1
                        if pnid:
                            conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                            if conf: target_cid = conf.client_id
                        asyncio.create_task(delayed_sync_chatwoot_name(target_cid, from_phone, profile_name, 15))

                    if msg_type in ['button', 'interactive', 'text']:
                        user_input = ""
                        if msg_type == 'button': user_input = msg.get("button", {}).get("text", "")
                        elif msg_type == 'interactive':
                            reply = msg.get("interactive", {})
                            user_input = reply.get("button_reply", {}).get("title") or reply.get("list_reply", {}).get("title") or ""
                        elif msg_type == 'text': user_input = msg.get("text", {}).get("body", "")
                        
                        user_input_clean = user_input.lower().strip()
                        if not user_input_clean: continue
                        
                        await notify_ai_memory(client_id=target_cid, phone=from_phone, content=user_input, msg_type="text", direction="incoming")

                        # Identificar Cliente
                        client_id = None
                        trigger = None
                        orig_wamid = msg.get("context", {}).get("id")
                        if orig_wamid:
                            clean_orig = orig_wamid.replace("wamid.", "")
                            orig_msg = db.query(models.MessageStatus).filter((models.MessageStatus.message_id == orig_wamid) | (models.MessageStatus.message_id == clean_orig)).first()
                            if orig_msg and orig_msg.trigger:
                                trigger = orig_msg.trigger
                                client_id = trigger.client_id
                        
                        if not client_id:
                            pnid = value.get("metadata", {}).get("phone_number_id")
                            conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                            if conf: client_id = conf.client_id
                        
                        if not client_id: continue

                        # Update Window Cache
                        clean_from = "".join(filter(str.isdigit, str(from_phone)))
                        win = db.query(models.ContactWindow).filter(models.ContactWindow.client_id == client_id, models.ContactWindow.phone == clean_from).first()
                        if win: win.last_interaction_at = datetime.now(timezone.utc)
                        else: db.add(models.ContactWindow(client_id=client_id, phone=clean_from, last_interaction_at=datetime.now(timezone.utc)))
                        db.commit()

                        # Block Check
                        block_k = get_setting("AUTO_BLOCK_KEYWORDS", "bloquear,parar,sair", client_id=client_id).lower().split(",")
                        if any(k.strip() in user_input_clean for k in block_k):
                            if trigger: trigger.total_blocked = (trigger.total_blocked or 0) + 1
                            suffix = clean_from[-8:]
                            if not db.query(models.BlockedContact).filter(models.BlockedContact.client_id == client_id, models.BlockedContact.phone.like(f"%{suffix}")).first():
                                db.add(models.BlockedContact(client_id=client_id, phone=clean_from, name=profile_name, reason=f"Auto-bloqueio: {user_input_clean}"))
                            db.commit()
                        else:
                            if trigger:
                                if orig_wamid:
                                    ms = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == clean_orig).with_for_update().first()
                                    if ms and not ms.is_interaction:
                                        ms.is_interaction = True
                                        trigger.total_interactions = (trigger.total_interactions or 0) + 1
                                        if ms.status not in ['read', 'failed']: 
                                            ms.status = 'read'
                                            db.execute(text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"), {"tid": trigger.id})
                                db.commit()

                            # Funnel Match
                            matched_funnel = db.query(models.Funnel).filter(models.Funnel.client_id == client_id, or_(func.lower(models.Funnel.trigger_phrase) == user_input_clean, models.Funnel.trigger_phrase.ilike(f"%,{user_input_clean},%"), models.Funnel.trigger_phrase.ilike(f"{user_input_clean},%"), models.Funnel.trigger_phrase.ilike(f"%,{user_input_clean}"))).first()
                            if matched_funnel:
                                from services.discovery import discover_or_create_chatwoot_conversation
                                cw = ChatwootClient(client_id=client_id)
                                inbox_id = await cw.get_default_whatsapp_inbox()
                                conv_res = await cw.ensure_conversation(from_phone, profile_name or from_phone, inbox_id)
                                conv_id = conv_res.get("conversation_id")
                                
                                # Idempotency check: Use o ID único da mensagem da Meta (wamid) como trava definitiva
                                msg_id = msg.get("id")
                                existing_interaction = db.query(models.ScheduledTrigger).filter(
                                    models.ScheduledTrigger.client_id == client_id,
                                    models.ScheduledTrigger.idempotency_key == msg_id
                                ).first()

                                if not existing_interaction:
                                    try:
                                        new_trigger = models.ScheduledTrigger(
                                            client_id=client_id, 
                                            funnel_id=matched_funnel.id, 
                                            contact_phone=from_phone, 
                                            contact_name=profile_name, 
                                            conversation_id=conv_id, 
                                            chatwoot_account_id=cw.account_id,
                                            chatwoot_contact_id=conv_res.get("contact_id"),
                                            chatwoot_inbox_id=inbox_id,
                                            status='processing', 
                                            scheduled_time=datetime.now(timezone.utc), 
                                            template_name=f"Interação: {user_input}", 
                                            is_bulk=False, 
                                            is_interaction=True, 
                                            parent_id=trigger.id if trigger else None,
                                            idempotency_key=msg_id # Guarda o ID único para evitar duplicidade
                                        )
                                        db.add(new_trigger)
                                        db.commit()
                                        await rabbitmq.publish("zapvoice_funnel_executions", {"trigger_id": new_trigger.id, "funnel_id": matched_funnel.id, "conversation_id": conv_id, "contact_phone": from_phone, "chatwoot_inbox_id": inbox_id})
                                    except Exception as e:
                                        db.rollback()
                                        if "UNIQUE constraint failed" in str(e) or "duplicate key value" in str(e).lower():
                                            logger.info(f"🚫 [IDEMPOTENCY] Race Condition evitada pelo Banco de Dados (ID: {msg_id})")
                                        else:
                                            logger.error(f"❌ Erro ao criar disparo por interação: {e}")
                                else:
                                    logger.info(f"🚫 [IDEMPOTENCY] Evento duplicado ignorado (ID: {msg_id})")

                        processed_events.append({"type": "interaction", "phone": from_phone, "payload": user_input_clean})

        db.close()
        if return_url and processed_events:
            async with httpx.AsyncClient() as client:
                try: await client.post(return_url, json={"events": processed_events}, timeout=5.0)
                except: pass
    except Exception as e: logger.error(f"❌ Error WhatsApp event: {e}")

async def handle_deferred_post_delivery(trigger_id: int, message_record_id: int, status: str, msg_id: str, recipient: str):
    await asyncio.sleep(10)
    db = SessionLocal()
    try:
        trigger, message_record = db.query(models.ScheduledTrigger).get(trigger_id), db.query(models.MessageStatus).get(message_record_id)
        if not trigger or not message_record: return

        log_node_execution(db, trigger, node_id='DISCOVERY', status='processing', details='Sincronizando...')
        db.commit()

        convo_id = trigger.conversation_id
        if not convo_id:
            from chatwoot_client import ChatwootClient
            cw = ChatwootClient(client_id=trigger.client_id)
            inbox_id = await cw.get_default_whatsapp_inbox()
            res = await cw.ensure_conversation(recipient, trigger.contact_name or recipient, inbox_id)
            convo_id = res.get("conversation_id")
            if convo_id:
                trigger.conversation_id = convo_id
                db.commit()

        log_node_execution(db, trigger, node_id='DISCOVERY', status='completed', details='SINCRONIZADO', extra_data={"conversation_id": convo_id})
        db.commit()

        # --- [NEW] PRIVATE NOTE DELIVERY ---
        # Se a mensagem possui uma nota privada pendente e ainda não foi postada, agendamos o envio.
        if message_record.pending_private_note and not message_record.private_note_posted and convo_id:
            logger.info(f"💬 [DEFERRED] Agendando nota privada para {recipient} (Conv: {convo_id})")
            await rabbitmq.publish("chatwoot_private_messages", {
                "client_id": trigger.client_id,
                "phone": recipient,
                "message": message_record.pending_private_note,
                "trigger_id": trigger.id,
                "conversation_id": convo_id,
                "delay": trigger.private_message_delay or 5
            })
            message_record.private_note_posted = True
        db.commit()
    finally: db.close()


import asyncio
import models
from database import SessionLocal
from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from services.engine import execute_funnel
from core.logger import setup_logger

logger = setup_logger(__name__)

async def process_bulk_send(trigger_id: int, template_name: str, contacts: list, delay: int, concurrency: int, language: str = 'pt_BR', components: list = None, direct_message: str = None, direct_message_params: dict = None):
    print(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language} | DM: {bool(direct_message)}")
    
    if not contacts:
        db = SessionLocal()
        t = db.query(models.ScheduledTrigger).get(trigger_id)
        if t:
             t.status = "completed"
             t.total_sent = 0
             t.total_failed = 0
             db.commit()
        db.close()
        return

    total = len(contacts)
    sent_count = 0
    failed_count = 0

    concurrency = max(1, int(concurrency or 1))
    delay = max(0, int(delay or 5))

    # Initialize contact tracking and get client context
    db_init = SessionLocal()
    init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
    
    p_message = None
    c_id = None
    
    if init_trig:
         chatwoot = ChatwootClient(client_id=init_trig.client_id)
         all_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in contacts]
         init_trig.pending_contacts = all_phones
         init_trig.processed_contacts = []
         # Reset counters to 0 just in case
         init_trig.total_sent = 0
         init_trig.total_failed = 0
         
         p_message = init_trig.private_message
         p_delay = init_trig.private_message_delay
         p_concurrency = init_trig.private_message_concurrency
         c_id = init_trig.client_id
         
         db_init.commit()
    else:
         chatwoot = ChatwootClient()

    db_init.close()

    for i in range(0, total, concurrency):
        # Check if cancelled or cancelling
        db_check = SessionLocal()
        current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
        if not current_trig or current_trig.status in ['cancelled', 'cancelling']:
             print(f"Bulk send {trigger_id} CANCELLED by user.")
             if current_trig:
                 current_trig.status = 'cancelled'
                 db_check.commit()
             db_check.close()
             return

        # Check for PAUSED state
        while current_trig and current_trig.status == 'paused':
            print(f"Bulk send {trigger_id} PAUSED. Waiting 5s...")
            db_check.close()
            await asyncio.sleep(5)
            db_check = SessionLocal()
            current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not current_trig or current_trig.status in ['cancelled', 'cancelling']:
                db_check.close()
                return

        # Line 81 was removed to keep session open for following operations
        
        batch = contacts[i:i + concurrency]
        batch_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in batch]
        
        # Update contact tracking
        if current_trig.processed_contacts is None: current_trig.processed_contacts = []
        current_trig.processed_contacts = list(set((current_trig.processed_contacts or []) + batch_phones))
        all_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in contacts]
        current_trig.pending_contacts = [p for p in all_phones if p not in current_trig.processed_contacts]
        
        # Check for blocked contacts
        blocked_list = [b.phone for b in db_check.query(models.BlockedContact).filter(
            models.BlockedContact.client_id == current_trig.client_id
        ).all()]
        
        db_check.commit()
        db_check.close()

        print(f"Processing batch {i} to {i+concurrency}")
        
        # Prepare tasks (clean template name for A/B variations)
        actual_template_name = template_name.split('|')[0] if template_name and '|' in template_name else template_name

        async def mock_blocked(phone):
            return {"error": True, "detail": "Contato Bloqueado"}
            
        async def send_smart_message(phone):
            send_type = "UNKNOWN"
            try:
                # 1. 24h Window Check (if DM configured)
                if direct_message:
                    try:
                        print(f"🔍 [Smart Send] Checking window for {phone}...")
                        inbox_id = await chatwoot.get_default_whatsapp_inbox()
                        if not inbox_id:
                             print(f"⚠️ [Smart Send] No inbox found for {phone}. Fallback.")
                        else:
                            conv_id = await chatwoot.ensure_conversation(phone, phone, inbox_id)
                            
                            if conv_id:
                                is_open = await chatwoot.is_within_24h_window(conv_id)
                                if is_open:
                                    print(f"🟢 [Smart Send] Window OPEN for {phone}. Sending Direct Message.")
                                    
                                    # Prepare Buttons
                                    buttons = []
                                    if direct_message_params:
                                        if isinstance(direct_message_params, list):
                                            buttons = direct_message_params
                                        elif isinstance(direct_message_params, dict):
                                            buttons = direct_message_params.get("buttons", [])
                                    
                                    # Extract texts
                                    btn_texts = []
                                    for b in buttons:
                                        if isinstance(b, str): btn_texts.append(b)
                                        elif isinstance(b, dict): btn_texts.append(b.get("text", "Botão"))
                                    
                                    res = None
                                    if btn_texts:
                                        res = await chatwoot.send_interactive_buttons(phone, direct_message, btn_texts)
                                    else:
                                        res = await chatwoot.send_text_direct(phone, direct_message)
                                    
                                    if res and not res.get("error"):
                                        return {"result": res, "type": "DIRECT_MESSAGE"}
                                    
                                    print(f"⚠️ [Smart Send] DM Failed: {res}. Fallback.")
                                else:
                                    print(f"🔒 [Smart Send] Window CLOSED for {phone}. Fallback to Template.")
                            else:
                                print(f"⚠️ [Smart Send] Could not ensure conversation for {phone}. Fallback.")

                    except Exception as e_dm:
                        print(f"⚠️ [Smart Send] Error checking window/sending DM: {e_dm}. Fallback to template.")

                # 2. Fallback: Template
                if actual_template_name:
                    print(f"📨 [Fallback] Sending Template '{actual_template_name}' to {phone}")
                    res = await chatwoot.send_template(phone, actual_template_name, language, components=components)
                    if res and not res.get("error"):
                        return {"result": res, "type": "TEMPLATE"}
                    print(f"❌ [Fallback] Template Failed: {res}")
                    return res
                
                print(f"❌ [Error] No template provided and Smart Send failed/skipped for {phone}")
                return {"error": True, "detail": "No template or direct message content provided"}
            except Exception as e:
                print(f"❌ [CRITICAL] Smart Send Exception: {e}")
                return {"error": True, "detail": str(e)}

        tasks = []
        for phone in batch_phones:
            if phone in blocked_list:
                print(f"🚫 Skipping blocked contact: {phone}")
                tasks.append(mock_blocked(phone))
            else:
                tasks.append(send_smart_message(phone))

        results = await asyncio.gather(*tasks)
        
        # Store message IDs and update batch statistics in DB
        batch_sent = 0
        batch_failed = 0
        db_msg = SessionLocal()
        try:
            for idx, res_wrapper in enumerate(results):
                is_success = False
                message_id = None
                failure_reason = None
                msg_type = "UNKNOWN"

                # Unpack result wrapper if successful
                res = res_wrapper
                if isinstance(res_wrapper, dict) and "type" in res_wrapper and "result" in res_wrapper:
                    res = res_wrapper["result"]
                    msg_type = res_wrapper["type"]

                if isinstance(res, dict):
                    if res.get("error"):
                        failure_reason = str(res.get("detail") or res.get("error"))
                    else:
                        # Logic for both Meta API (messages[0].id) and Chatwoot API (id)
                        messages = res.get('messages', [])
                        if messages:
                            message_id = messages[0].get('id')
                            is_success = True
                        elif res.get("id"):
                            # This handles records sent via Chatwoot API directly
                            message_id = str(res.get("id"))
                            is_success = True
                        else:
                            failure_reason = f"No message ID returned (Status: {res})"
                else:
                    failure_reason = "Invalid response format"

                if is_success:
                    batch_sent += 1
                    if message_id:
                        try:
                            msg_status = models.MessageStatus(
                                trigger_id=trigger_id,
                                message_id=message_id,
                                phone_number=batch_phones[idx],
                                status='sent',
                                message_type=msg_type
                            )
                            db_msg.add(msg_status)
                            
                            # NEW: Store pending private note content instead of queueing immediately
                            if p_message and p_message != "VARIES":
                                type_label = "MENSAGEM DIRETA (Livre)" if msg_type == "DIRECT_MESSAGE" else f"TEMPLATE OFICIAL ({actual_template_name})"
                                msg_status.pending_private_note = f"{p_message}\n\n📢 Enviado via: {type_label}"
                                logger.info(f"⏳ Private note stored for {batch_phones[idx]}, waiting for 'delivered' status.")
                            
                            db_msg.add(msg_status)
                        except Exception as e:
                             logger.error(f"Could not store message_id or enqueue private message: {e}")
                else:
                    batch_failed += 1
                    try:
                        import uuid
                        fake_id = f"failed_{uuid.uuid4()}" 
                        msg_status = models.MessageStatus(
                            trigger_id=trigger_id,
                            message_id=fake_id, 
                            phone_number=batch_phones[idx],
                            status='failed',
                            failure_reason=failure_reason or "Unknown Error"
                        )
                        db_msg.add(msg_status)
                    except Exception as e:
                        print(f"Could not store failure record: {e}")

            # Update Trigger counters incrementally
            t_update = db_msg.query(models.ScheduledTrigger).get(trigger_id)
            if t_update:
                t_update.total_sent = (t_update.total_sent or 0) + batch_sent
                t_update.total_failed = (t_update.total_failed or 0) + batch_failed
                
                # CUSTO: Só incrementa se for TEMPLATE. 
                # Se for DIRECT_MESSAGE (sessão 24h aberta), o custo é zero.
                if t_update.cost_per_unit:
                    # Precisamos saber quantos do batch foram templates
                    # Mas como o worker e o webhook também atualizam o total_cost baseado em 'delivered',
                    # o ideal é manter a lógica incremental e consistente.
                    # No momento do envio (sent), podemos colocar um custo 'provisório'.
                    pass # Deixamos o custo ser atualizado pelo Worker/Webhook para maior precisão (baseado em delivery)
                    # OU, se quisermos mostrar custo de 'enviados', fazemos aqui:
                    # t_update.total_cost = (t_update.total_cost or 0) + (cost_per_template_in_batch)
            
            sent_count += batch_sent
            failed_count += batch_failed
            db_msg.commit()
        except Exception as e:
            print(f"Error updating batch stats: {e}")
            db_msg.rollback()
        finally:
            db_msg.close()
        
        # Delay and Event
        db_ev = SessionLocal()
        t_ev = db_ev.query(models.ScheduledTrigger).get(trigger_id)
        
        progress_data = {
            "trigger_id": trigger_id,
            "client_id": t_ev.client_id if t_ev else None,
            "status": "processing",
            "sent": t_ev.total_sent if t_ev else sent_count,
            "failed": t_ev.total_failed if t_ev else failed_count,
            "blocked": t_ev.total_blocked if t_ev else 0,
            "total": total,
            "delivered": t_ev.total_delivered if t_ev else 0,
            "read": t_ev.total_read if t_ev else 0,
            "interactions": t_ev.total_interactions if t_ev else 0,
            "cost": t_ev.total_cost if t_ev else 0.0,
            "processed_contacts": t_ev.processed_contacts if t_ev else [],
            "pending_contacts": t_ev.pending_contacts if t_ev else []
        }
        
        # Capture and close before await
        db_ev.close()

        try:
            await rabbitmq.publish_event("bulk_progress", progress_data)
        except Exception as e:
            print(f"⚠️ Error publishing bulk progress: {e}")

        if i + concurrency < total:
            await asyncio.sleep(delay)

    # Final Update
    db_final = SessionLocal()
    t_final = db_final.query(models.ScheduledTrigger).get(trigger_id)
    if t_final and t_final.status != 'cancelled':
        final_sent = t_final.total_sent
        final_failed = t_final.total_failed
        t_final.status = "completed"
        db_final.commit()
        
        # Final Event - Re-fetch everything to avoid overwriting real-time updates from worker (read/interaction)
        progress_data = {
            "trigger_id": trigger_id,
            "status": "completed",
            "sent": t_final.total_sent,
            "failed": t_final.total_failed,
            "blocked": t_final.total_blocked or 0,
            "total": total,
            "delivered": t_final.total_delivered or 0,
            "read": t_final.total_read or 0,
            "interactions": t_final.total_interactions or 0,
            "cost": t_final.total_cost or 0.0,
            "processed_contacts": t_final.processed_contacts or [],
            "pending_contacts": t_final.pending_contacts or []
        }
        await rabbitmq.publish_event("bulk_progress", progress_data)
        
    db_final.close()
    print(f"Bulk send {trigger_id} COMPLETED. Sent: {sent_count}, Failed: {failed_count}")


async def process_bulk_funnel(trigger_id: int, funnel_id: int, contacts: list, delay: int, concurrency: int):
    print(f"Starting BULK FUNNEL {trigger_id} | Funnel: {funnel_id} | Contacts: {len(contacts or [])}")
    
    if not contacts:
        db = SessionLocal()
        t = db.query(models.ScheduledTrigger).get(trigger_id)
        if t:
             t.status = "completed"
             db.commit()
        db.close()
        return

    total = len(contacts)
    sent_count = 0
    failed_count = 0 
    concurrency = max(1, int(concurrency or 1))
    delay = max(0, int(delay or 5))

    async def safe_exec(c, blocked_list, p_message=None, client_id=None, p_delay=5, p_concurrency=1):
         # Extract phone and conversation_id safely
         if isinstance(c, str):
             phone = c
             conv_id = 0 # Will be resolved by engine if needed
         else:
             phone = (c.get('phone') or c.get('telefone')) if isinstance(c, dict) else str(c)
             # Fallback for Chatwoot objects (Funnel Bulk)
             if not phone and isinstance(c, dict):
                 phone = c.get('meta', {}).get('sender', {}).get('phone_number')
             
             conv_id = (c.get('id') or c.get('conversation_id')) if isinstance(c, dict) else 0
             conv_id = conv_id or 0
             
         if not phone:
              logger.warning(f"⚠️ [BULK] Skipped contact with no phone: {c}")
              return False

         if phone in blocked_list:
              print(f"🚫 Skipping blocked contact in funnel: {phone}")
              return False
         
         local_db = SessionLocal()
         try:
             print(f"👉 [BULK] Executing funnel for contact: {phone}")
             await execute_funnel(funnel_id, conv_id, trigger_id, phone, local_db)
             print(f"✅ [BULK] Funnel executed for {phone}")
             
             # Note: Private message queueing removed from here. 
             # It will be handled by execute_funnel -> engine.py on a per-step basis,
             # OR if there's a global trigger.private_message, it should be handled in the status webhook.
             
             return True
             
             return True
         except Exception as e:
             print(f"❌ [BULK] Error in bulk funnel item {phone}: {e}")
             return False
         finally:
             local_db.close()
    p_message = None
    p_delay = 5
    p_concurrency = 1
    c_id = None
    db_init = SessionLocal()
    init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
    if init_trig:
        p_message = init_trig.private_message
        p_delay = init_trig.private_message_delay
        p_concurrency = init_trig.private_message_concurrency
        c_id = init_trig.client_id
        
        # Se for um disparo em massa (funnel), atualiza lista de pendentes
        all_phones = []
        for c in contacts:
            if isinstance(c, str): all_phones.append(c)
            else: all_phones.append(c.get('phone') or c.get('telefone') or '')
        
        init_trig.pending_contacts = all_phones
        init_trig.processed_contacts = []
        db_init.commit()
    db_init.close()

    for i in range(0, total, concurrency):
        # Check cancellation
        db_check = SessionLocal()
        current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
        if not current_trig or current_trig.status == 'cancelled':
             print(f"Bulk funnel {trigger_id} CANCELLED by user.")
             db_check.close()
             return

        # Check for PAUSED state
        while current_trig and current_trig.status == 'paused':
            print(f"Bulk funnel {trigger_id} PAUSED. Waiting 5s...")
            db_check.close()
            await asyncio.sleep(5)
            db_check = SessionLocal()
            current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not current_trig or current_trig.status in ['cancelled', 'cancelling']:
                db_check.close()
                return
        
        # Check for blocked contacts
        blocked_list = [b.phone for b in db_check.query(models.BlockedContact).filter(
            models.BlockedContact.client_id == current_trig.client_id
        ).all()]
        
        # Update Statistics
        if i > 0:
            current_trig.total_sent = sent_count
            current_trig.total_failed = failed_count
            db_check.commit()
        db_check.close()

        batch = contacts[i:i + concurrency]
        print(f"Processing funnel batch {i} to {i+concurrency}")
        
        results = await asyncio.gather(*[safe_exec(c, blocked_list, p_message, c_id, p_delay, p_concurrency) for c in batch])

        
        for res in results:
            if res: sent_count += 1
            else: failed_count += 1
            
        if i + concurrency < total:
            # Emit WebSocket Event
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "processed": i + len(batch),
                "total": total,
                "sent": sent_count,
                "failed": failed_count,
                "blocked": 0, # total_blocked is only for buttons/mass send currently
                "status": "processing"
            })
            await asyncio.sleep(delay)

    # Final Update
    db_final = SessionLocal()
    t_final = db_final.query(models.ScheduledTrigger).get(trigger_id)
    if t_final and t_final.status != 'cancelled':
        t_final.status = "completed"
        t_final.total_sent = sent_count
        t_final.total_failed = failed_count
        db_final.commit()
    db_final.close()
    
    # Final Event
    db_final = SessionLocal()
    t_final = db_final.query(models.ScheduledTrigger).get(trigger_id)
    if t_final:
        await rabbitmq.publish_event("bulk_progress", {
            "trigger_id": trigger_id,
            "processed": total,
            "total": total,
            "sent": t_final.total_sent,
            "failed": t_final.total_failed,
            "delivered": t_final.total_delivered or 0,
            "read": t_final.total_read or 0,
            "interactions": t_final.total_interactions or 0,
            "blocked": t_final.total_blocked or 0,
            "cost": t_final.total_cost or 0.0,
            "status": "completed"
        })
    db_final.close()
    print(f"Bulk funnel {trigger_id} COMPLETED.")

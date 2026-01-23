
import asyncio
import models
from database import SessionLocal
from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from services.engine import execute_funnel

async def process_bulk_send(trigger_id: int, template_name: str, contacts: list, delay: int, concurrency: int, language: str = 'pt_BR', components: list = None):
    print(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language}")
    
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
    
    if init_trig:
         chatwoot = ChatwootClient(client_id=init_trig.client_id)
         all_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in contacts]
         init_trig.pending_contacts = all_phones
         init_trig.processed_contacts = []
         # Reset counters to 0 just in case
         init_trig.total_sent = 0
         init_trig.total_failed = 0
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
        
        batch = contacts[i:i + concurrency]
        batch_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in batch]
        
        # Update contact tracking
        if current_trig.processed_contacts is None: current_trig.processed_contacts = []
        current_trig.processed_contacts = list(set(current_trig.processed_contacts + batch_phones))
        all_phones = [c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '') for c in contacts]
        current_trig.pending_contacts = [p for p in all_phones if p not in current_trig.processed_contacts]
        
        # Check for blocked contacts
        blocked_list = [b.phone for b in db_check.query(models.BlockedContact).filter(
            models.BlockedContact.client_id == current_trig.client_id
        ).all()]
        
        db_check.commit()
        db_check.close()

        print(f"Processing batch {i} to {i+concurrency}")
        
        # Send batch
        async def mock_blocked(phone):
            return {"error": True, "detail": "Contato Bloqueado"}

        tasks = []
        for phone in batch_phones:
            if phone in blocked_list:
                print(f"🚫 Skipping blocked contact: {phone}")
                tasks.append(mock_blocked(phone))
            else:
                tasks.append(chatwoot.send_template(phone, template_name, language, components=components))

        results = await asyncio.gather(*tasks)
        
        # Store message IDs and update batch statistics in DB
        batch_sent = 0
        batch_failed = 0
        db_msg = SessionLocal()
        try:
            for idx, res in enumerate(results):
                is_success = False
                message_id = None
                failure_reason = None

                if isinstance(res, dict):
                    if res.get("error"):
                        failure_reason = str(res.get("detail") or res.get("error"))
                    else:
                        messages = res.get('messages', [])
                        if messages:
                            message_id = messages[0].get('id')
                            is_success = True
                        else:
                            failure_reason = "No message ID returned"
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
                                status='sent'
                            )
                            db_msg.add(msg_status)
                        except Exception as e:
                             print(f"Could not store message_id: {e}")
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
                if t_update.cost_per_unit:
                    t_update.total_cost = (t_update.total_sent or 0) * t_update.cost_per_unit
            
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
        await rabbitmq.publish_event("bulk_progress", progress_data)
        db_ev.close()

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

    async def safe_exec(c, blocked_list):
         phone = c.get('phone')
         if phone in blocked_list:
              print(f"🚫 Skipping blocked contact in funnel: {phone}")
              return False
         
         local_db = SessionLocal()
         try:
             await execute_funnel(funnel_id, c.get('id'), trigger_id, phone, local_db)
             return True
         except Exception as e:
             print(f"Error in bulk funnel item {c}: {e}")
             return False
         finally:
             local_db.close()

    for i in range(0, total, concurrency):
        # Check cancellation
        db_check = SessionLocal()
        current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
        if not current_trig or current_trig.status == 'cancelled':
             print(f"Bulk funnel {trigger_id} CANCELLED by user.")
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
        
        results = await asyncio.gather(*[safe_exec(c, blocked_list) for c in batch])
        
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

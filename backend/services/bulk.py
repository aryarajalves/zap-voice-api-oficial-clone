import asyncio
import models
from database import SessionLocal
from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from core.logger import setup_logger
from services.utils.bulk_helpers import render_template_body, extract_body_from_components, resolve_template_body_with_sync
from services.utils.phone_utils import normalize_phone
from services.bulk_persistence import get_sent_phones_set, update_trigger_stats, record_blocked_status
from services.bulk_core import send_smart_message

# Re-exportações para compatibilidade retrógrada (Padrão Barrel)
from services.bulk_funnel import process_bulk_funnel
from services.bulk_simulation import simulate_lifecycle, notify_progress

import zoneinfo
from datetime import datetime

logger = setup_logger(__name__)
BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")

def translate_meta_error(reason: str) -> str:
    if not reason:
        return reason
    if "132015" in reason or "paused due to low quality" in reason:
        return "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade."
    if "131049" in reason or "healthy ecosystem engagement" in reason:
        return "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema."
    if "131026" in reason or "undeliverable" in reason.lower():
        return "Erro Meta 131026: Mensagem não entregável"
    if "(#2)" in reason or "service temporarily unavailable" in reason.lower():
        return "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)"
    if "131000" in reason or "something went wrong" in reason.lower():
        return "(#131000) Algo deu errado (Erro do Servidor da Meta)"
    if "too many requests" in reason.lower() or "rate limit" in reason.lower() or "limit reached" in reason.lower():
        return "(#80007) Limite de requisições excedido. Aumente o delay entre os disparos."
    return reason

async def process_bulk_send(trigger_id: int, template_name: str, contacts: list, delay: int, concurrency: int, language: str = 'pt_BR', components: list = None, direct_message: str = None, direct_message_params: dict = None):
    logger.info(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language} | DM: {bool(direct_message)}")
    
    if not contacts:
        db = SessionLocal()
        try:
            db.query(models.ScheduledTrigger).filter_by(id=trigger_id).update({
                "status": "completed", "total_sent": 0, "total_failed": 0
            })
            db.commit()
        finally:
            db.close()
        return

    total = len(contacts)
    sent_count = 0
    failed_count = 0
    concurrency = max(1, int(concurrency or 1))
    delay = max(0, int(delay or 5))

    # Initialize tracking and client
    db_init = SessionLocal()
    try:
        init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
        if not init_trig:
             return logger.error(f"ScheduledTrigger {trigger_id} not found")
             
        chatwoot = ChatwootClient(client_id=init_trig.client_id)
        all_phones = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in contacts]
        
        init_trig.contacts_list = contacts
        init_trig.pending_contacts = all_phones
        init_trig.processed_contacts = []
        init_trig.total_sent = init_trig.total_failed = init_trig.total_blocked = 0
        init_trig.total_contacts = total
        
        # Guardar o timestamp de início
        pdata = dict(init_trig.processed_data or {})
        pdata["started_at"] = datetime.utcnow().isoformat()
        pdata.pop("finished_at", None)
        init_trig.processed_data = pdata
        
        c_label = init_trig.chatwoot_label
        c_id = init_trig.client_id

        from services.engine import log_node_execution
        client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=init_trig.client_id)
        log_node_execution(db_init, init_trig, node_id='DISCOVERY', status='completed', details=f'{client_name}: Iniciando disparo em massa...')
        log_node_execution(db_init, init_trig, node_id='DELIVERY', status='processing', details=f'{client_name}: Enviando para {total} contatos...')
        db_init.commit()
    finally:
        db_init.close()

    # Pre-fetch template and interaction data
    template_body_cache = None
    template_btn_info = {"quick_replies": [], "has_special_buttons": False}
    if template_name and c_id:
        db_tmpl = SessionLocal()
        try:
            template_body_cache, template_btn_info = await resolve_template_body_with_sync(db_tmpl, c_id, template_name)
        finally:
            db_tmpl.close()

    retries_map = {}
    i = 0
    while i < len(contacts):
        db_check = SessionLocal()
        try:
            current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not current_trig or current_trig.status in ['cancelled', 'cancelling', 'deleted_pending', 'aborted', 'failed']:
                if current_trig:
                    if current_trig.status == 'deleted_pending': db_check.delete(current_trig)
                    elif current_trig.status == 'cancelling': current_trig.status = 'cancelled'
                    db_check.commit()
                return

            # Atualizar heartbeat a cada iteração
            pdata = dict(current_trig.processed_data or {})
            pdata["last_heartbeat"] = datetime.utcnow().isoformat()
            current_trig.processed_data = pdata
            db_check.commit()

            while current_trig and current_trig.status == 'paused':
                # Atualizar heartbeat enquanto pausado
                pdata = dict(current_trig.processed_data or {})
                pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                current_trig.processed_data = pdata
                db_check.commit()
                db_check.close()
                await asyncio.sleep(5)
                db_check = SessionLocal()
                current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
                if not current_trig or current_trig.status in ['cancelled', 'cancelling']: return

            batch = contacts[i:i + concurrency]
            batch_phones_norm = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in batch]
            
            # Update tracking
            current_trig.processed_contacts = list(set((current_trig.processed_contacts or []) + batch_phones_norm))
            current_trig.pending_contacts = [p for p in all_phones if p not in current_trig.processed_contacts]
            
            # Blocked list (with project sharing inheritance)
            client_ids = [c_id]
            client = db_check.query(models.Client).filter(models.Client.id == c_id).first()
            if client and client.project_id:
                sibling_clients = db_check.query(models.Client.id).filter(models.Client.project_id == client.project_id).all()
                client_ids = [c.id for c in sibling_clients]

            blocked_raw = db_check.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id.in_(client_ids)
            ).all()
            blocked_set = set()
            for b in blocked_raw:
                p_norm = normalize_phone(b[0])
                if p_norm:
                    blocked_set.add(p_norm)
                    if len(p_norm) >= 8:
                        blocked_set.add(p_norm[-8:])
            
            # Add resting contacts
            now = datetime.utcnow()
            resting_raw = db_check.query(models.RestingContact.phone).filter(
                models.RestingContact.client_id.in_(client_ids),
                models.RestingContact.expires_at > now
            ).all()
            for r in resting_raw:
                p_norm = normalize_phone(r[0])
                if p_norm:
                    blocked_set.add(p_norm)
                    if len(p_norm) >= 8:
                        blocked_set.add(p_norm[-8:])
            
            sent_phones_set = await get_sent_phones_set(db_check, trigger_id)
            db_check.commit()
        finally:
            db_check.close()

        # Interaction data pre-fetch
        db_fetch = SessionLocal()
        try:
            windows = db_fetch.query(models.ContactWindow).filter(models.ContactWindow.client_id == c_id, models.ContactWindow.phone.in_(batch_phones_norm)).all()
            batch_interaction_map = {w.phone: w.last_interaction_at for w in windows}
        finally:
            db_fetch.close()

        tasks = []
        batch_meta = []
        seen_in_batch = set()

        for c in batch:
            phone_raw = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or c.get('whatsapp') or '')
            phone = normalize_phone(phone_raw)
            if not phone or phone in seen_in_batch or phone in sent_phones_set: continue
            seen_in_batch.add(phone)

            # Name extraction
            name = ""
            if isinstance(c, dict):
                name = c.get('{{1}}') or c.get('1') or c.get('name') or c.get('nome') or c.get('cliente') or ""
                if not name and 'components' in c:
                    for comp in c['components']:
                        if str(comp.get("type", "")).lower() == "body":
                            p0 = comp.get("parameters", [])[0] if comp.get("parameters") else None
                            name = (p0.get("text") if isinstance(p0, dict) else p0) or ""
                            break

            phone_suffix = phone[-8:] if len(phone) >= 8 else phone
            if phone in blocked_set or phone_suffix in blocked_set:
                tasks.append(asyncio.create_task(asyncio.to_thread(record_blocked_status, trigger_id, phone)))
                batch_meta.append({"phone": phone, "name": name, "blocked": True, "vars": {}, "contact_obj": c})
                continue

            # Vars extraction (1-5)
            cvars = {}
            per_contact_components = c.get('components') if isinstance(c, dict) else None
            for v_idx in range(1, 6):
                val = c.get(str(v_idx)) or c.get(f"{{{{{v_idx}}}}}") or c.get(v_idx) if isinstance(c, dict) else None
                if not val and per_contact_components:
                    for comp in per_contact_components:
                        if str(comp.get("type", "")).lower() == "body":
                            params = comp.get("parameters", [])
                            if len(params) >= v_idx:
                                p = params[v_idx-1]
                                val = p.get("text") if isinstance(p, dict) else p
                            break
                if v_idx == 1 and not val: val = name
                cvars[f"var{v_idx}"] = str(val) if val is not None else ""

            batch_meta.append({"phone": phone, "name": name, "blocked": False, "vars": cvars, "components": per_contact_components, "contact_obj": c})
            tasks.append(send_smart_message(
                chatwoot, phone, trigger_id, template_name.split('|')[0], language,
                components=per_contact_components, direct_message=direct_message, direct_message_params=direct_message_params,
                last_interaction=batch_interaction_map.get(phone), template_body_cache=template_body_cache,
                template_btn_info=template_btn_info, contact_name=name,
                chatwoot_label=c_label,
                conversation_id=c.get('conversation_id') or c.get('id') if isinstance(c, dict) else None
            ))

        results = await asyncio.gather(*tasks)
        
        # Persist results
        db_msg = SessionLocal()
        sent_message_ids = []
        
        try:
            for idx, res in enumerate(results):
                meta = batch_meta[idx]
                if meta["blocked"]:
                    try:
                        update_trigger_stats(db_msg, trigger_id, failed=1)
                    except Exception as e_block_stat:
                        db_msg.rollback()
                        logger.error(f"❌ Erro ao atualizar estatísticas de bloqueio para {meta['phone']}: {e_block_stat}")
                    continue
                
                is_success = False
                message_id = None
                msg_type = res.get("type", "UNKNOWN") if isinstance(res, dict) else "UNKNOWN"
                
                if isinstance(res, dict) and not res.get("error"):
                    raw_res = res.get("result") or res
                    message_id = (raw_res.get("messages", [{}])[0].get("id") or raw_res.get("id", "")).replace("wamid.", "")
                    if message_id: is_success = True

                try:
                    existing_status = db_msg.query(models.MessageStatus).filter_by(trigger_id=trigger_id, phone_number=meta["phone"]).first()
                    if existing_status:
                        if existing_status.status == 'sent':
                            update_trigger_stats(db_msg, trigger_id, sent=-1)
                        elif existing_status.status == 'failed':
                            if existing_status.failure_reason == 'BLOCKED_VIA_BUTTON':
                                update_trigger_stats(db_msg, trigger_id, blocked=-1)
                            else:
                                update_trigger_stats(db_msg, trigger_id, failed=-1)
                        db_msg.delete(existing_status)
                        db_msg.commit()

                    if is_success:
                        if direct_message:
                            content = direct_message
                        elif template_body_cache:
                            content = render_template_body(template_body_cache, meta["components"] or [], contact_name=meta["name"])
                        else:
                            content = extract_body_from_components(meta["components"] or [])
                            if not content:
                                content = f"[Template: {template_name}]"
                        
                        msg_status = models.MessageStatus(
                            trigger_id=trigger_id, message_id=message_id, phone_number=meta["phone"],
                            contact_name=meta.get("name") or "",
                            status='sent', message_type=msg_type, content=content, template_name=template_name,
                            **meta["vars"]
                        )
                        db_msg.add(msg_status)
                        db_msg.commit()
                        
                        update_trigger_stats(db_msg, trigger_id, sent=1)
                        sent_count += 1
                        sent_message_ids.append(message_id)
                    else:
                        reason = "Erro na API da Meta ou dados inválidos"
                        if isinstance(res, dict):
                            if res.get("detail"):
                                reason = res.get("detail")
                            elif res.get("error"):
                                err_val = res.get("error")
                                if isinstance(err_val, bool):
                                    reason = res.get("detail") or "Erro na API da Meta ou dados inválidos"
                                else:
                                    reason = str(err_val)
                        reason = translate_meta_error(reason)
                        
                        fail_msg = models.MessageStatus(
                            trigger_id=trigger_id,
                            phone_number=meta["phone"],
                            status='failed',
                            failure_reason=reason,
                            content=f"[Falha no Envio] {template_name or 'Mensagem Direta'}"
                        )
                        db_msg.add(fail_msg)
                        db_msg.commit()
                        
                        update_trigger_stats(db_msg, trigger_id, failed=1)
                        failed_count += 1
                        
                        if "132015" in reason or "paused due to low quality" in reason:
                            reason = "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade."
                            fail_msg.failure_reason = reason
                            
                            db_abort = SessionLocal()
                            try:
                                t_abort = db_abort.query(models.ScheduledTrigger).get(trigger_id)
                                if t_abort:
                                    t_abort.status = 'aborted'
                                    t_abort.failure_reason = reason
                                    db_abort.commit()
                                    logger.error(f"🛑 [ABORT] Disparo {trigger_id} abortado. Template pausado por baixa qualidade.")
                            finally:
                                db_abort.close()
                except Exception as e_db_single:
                    db_msg.rollback()
                    logger.error(f"❌ Erro de banco de dados ao persistir status para o telefone {meta['phone']}: {e_db_single}")
            
            import os
            if os.getenv("SIMULATE_MESSAGING", "false").lower() in ("true", "1", "yes"):
                for mid in sent_message_ids:
                    asyncio.create_task(simulate_lifecycle(mid, trigger_id, c_id))
        finally:
            db_msg.close()

        # Progress Event
        db_progress = SessionLocal()
        try:
            t_prog = db_progress.query(models.ScheduledTrigger).get(trigger_id)
            if t_prog:
                await rabbitmq.publish_event("bulk_progress", {
                    "trigger_id": trigger_id,
                    "status": "processing",
                    "sent": t_prog.total_sent or 0,
                    "total_sent": t_prog.total_sent or 0,
                    "failed": t_prog.total_failed or 0,
                    "total_failed": t_prog.total_failed or 0,
                    "delivered": t_prog.total_delivered or 0,
                    "total_delivered": t_prog.total_delivered or 0,
                    "read": t_prog.total_read or 0,
                    "total_read": t_prog.total_read or 0,
                    "interactions": t_prog.total_interactions or 0,
                    "total_interactions": t_prog.total_interactions or 0,
                    "blocked": t_prog.total_blocked or 0,
                    "total_blocked": t_prog.total_blocked or 0,
                    "cost": float(t_prog.total_cost) if t_prog.total_cost else 0.0,
                    "total_cost": float(t_prog.total_cost) if t_prog.total_cost else 0.0,
                    "total_paid_templates": t_prog.total_paid_templates or 0,
                    "total": len(contacts),
                    "total_contacts": len(contacts)
                })
        finally:
            db_progress.close()
            
        i += concurrency
        if i < len(contacts): await asyncio.sleep(delay)

    # Finalize
    db_final = SessionLocal()
    try:
        t = db_final.query(models.ScheduledTrigger).get(trigger_id)
        if t and t.status != 'cancelled':
            from services.engine import log_node_execution
            client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=t.client_id)
            log_node_execution(db_final, t, node_id='DELIVERY', status='completed', details=f'{client_name}: Envio finalizado para {t.total_sent} contatos.')
            
            pdata = dict(t.processed_data or {})
            pdata["finished_at"] = datetime.utcnow().isoformat()
            t.processed_data = pdata
            t.status = "completed"
            db_final.commit()
            
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "status": "completed",
                "processed_data": pdata,
                "sent": t.total_sent or 0,
                "total_sent": t.total_sent or 0,
                "failed": t.total_failed or 0,
                "total_failed": t.total_failed or 0,
                "delivered": t.total_delivered or 0,
                "total_delivered": t.total_delivered or 0,
                "read": t.total_read or 0,
                "total_read": t.total_read or 0,
                "interactions": t.total_interactions or 0,
                "total_interactions": t.total_interactions or 0,
                "blocked": t.total_blocked or 0,
                "total_blocked": t.total_blocked or 0,
                "cost": float(t.total_cost) if t.total_cost else 0.0,
                "total_cost": float(t.total_cost) if t.total_cost else 0.0,
                "total_paid_templates": t.total_paid_templates or 0,
                "total": total,
                "total_contacts": total
            })
    finally:
         db_final.close()

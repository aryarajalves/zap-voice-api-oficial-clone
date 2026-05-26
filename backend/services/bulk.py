import asyncio
import models
from sqlalchemy import text
from database import SessionLocal
from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from services.engine import execute_funnel
from core.logger import setup_logger
from services.utils.bulk_helpers import render_template_body, extract_template_buttons, extract_body_from_components, resolve_template_body_with_sync
from services.utils.phone_utils import normalize_phone, get_phone_suffix
from services.bulk_persistence import get_sent_phones_set, update_trigger_stats, record_blocked_status
from services.bulk_core import send_smart_message

import zoneinfo
from datetime import datetime, timezone, timedelta
logger = setup_logger(__name__)
BRAZIL_TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")

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

    for i in range(0, total, concurrency):
        db_check = SessionLocal()
        try:
            current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not current_trig or current_trig.status in ['cancelled', 'cancelling', 'deleted_pending']:
                 if current_trig:
                     if current_trig.status == 'deleted_pending': db_check.delete(current_trig)
                     elif current_trig.status == 'cancelling': current_trig.status = 'cancelled'
                     db_check.commit()
                 return

            while current_trig and current_trig.status == 'paused':
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
            
            # Blocked list
            blocked_raw = db_check.query(models.BlockedContact.phone).filter_by(client_id=c_id).all()
            blocked_set = {normalize_phone(b[0]) for b in blocked_raw}
            
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

            if phone in blocked_set:
                tasks.append(asyncio.create_task(asyncio.to_thread(record_blocked_status, trigger_id, phone)))
                batch_meta.append({"phone": phone, "name": name, "blocked": True, "vars": {}})
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

            batch_meta.append({"phone": phone, "name": name, "blocked": False, "vars": cvars, "components": per_contact_components})
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
        try:
            for idx, res in enumerate(results):
                meta = batch_meta[idx]
                if meta["blocked"]:
                    update_trigger_stats(db_msg, trigger_id, blocked=1)
                    continue
                
                is_success = False
                message_id = None
                msg_type = res.get("type", "UNKNOWN") if isinstance(res, dict) else "UNKNOWN"
                
                if isinstance(res, dict) and not res.get("error"):
                    raw_res = res.get("result") or res
                    message_id = (raw_res.get("messages", [{}])[0].get("id") or raw_res.get("id", "")).replace("wamid.", "")
                    if message_id: is_success = True

                if is_success:
                    # Prioridade 1: Renderizar o body do cache com as variáveis do contato
                    if direct_message:
                        content = direct_message
                    elif template_body_cache:
                        content = render_template_body(template_body_cache, meta["components"] or [], contact_name=meta["name"])
                    else:
                        # Prioridade 2: Extrair diretamente dos components preenchidos (já têm valores reais)
                        content = extract_body_from_components(meta["components"] or [])
                        if not content:
                            # Fallback final
                            content = f"[Template: {template_name}]"
                    msg_status = models.MessageStatus(
                        trigger_id=trigger_id, message_id=message_id, phone_number=meta["phone"],
                        contact_name=meta.get("name") or "",
                        status='sent', message_type=msg_type, content=content, template_name=template_name,
                        **meta["vars"]
                    )
                    # A nota privada é enviada imediatamente pelo _post_send em bulk_core.py
                    # NÃO definir pending_private_note aqui para evitar envio duplicado
                    # (o mecanismo deferred do whatsapp.py dispararia uma 2ª nota ao receber 'delivered')
                    
                    db_msg.add(msg_status)
                    update_trigger_stats(db_msg, trigger_id, sent=1)
                    sent_count += 1
                else:
                    update_trigger_stats(db_msg, trigger_id, failed=1)
                    failed_count += 1
                    # CRIAR REGISTRO DE FALHA PARA O RELATÓRIO
                    reason = "Erro na API da Meta ou dados inválidos"
                    if isinstance(res, dict) and res.get("error"):
                        reason = res.get("error")
                    
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=meta["phone"],
                        status='failed',
                        failure_reason=reason,
                        content=f"[Falha no Envio] {template_name or 'Mensagem Direta'}"
                    )
                    db_msg.add(fail_msg)
            db_msg.commit()
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
                    "total": total,
                    "total_contacts": total
                })
        finally:
            db_progress.close()
            
        if i + concurrency < total: await asyncio.sleep(delay)

    # Finalize
    db_final = SessionLocal()
    try:
        t = db_final.query(models.ScheduledTrigger).get(trigger_id)
        if t and t.status != 'cancelled':
            from services.engine import log_node_execution
            client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=t.client_id)
            log_node_execution(db_final, t, node_id='DELIVERY', status='completed', details=f'{client_name}: Envio finalizado para {t.total_sent} contatos.')
            t.status = "completed"
            db_final.commit()
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "status": "completed",
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
                "total": total,
                "total_contacts": total
            })
    finally:
        db_final.close()

async def process_bulk_funnel(trigger_id: int, funnel_id: int, contacts: list, delay: int, concurrency: int):
    # Modularização simplificada do funnel similar ao bulk_send
    logger.info(f"Starting BULK FUNNEL {trigger_id} | Funnel: {funnel_id}")
    if not contacts:
        db = SessionLocal()
        try:
            t = db.query(models.ScheduledTrigger).get(trigger_id)
            if t: t.status = "completed"
            db.commit()
        finally:
            db.close()
        return

    total = len(contacts)
    sent_count = failed_count = 0
    concurrency = max(1, int(concurrency))
    delay = max(0, int(delay))

    db_init = SessionLocal()
    try:
        t = db_init.query(models.ScheduledTrigger).get(trigger_id)
        if t:
            from services.engine import log_node_execution
            client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=t.client_id)
            log_node_execution(db_init, t, node_id='DISCOVERY', status='completed', details=f'{client_name}: Iniciando disparo de funis...')
            log_node_execution(db_init, t, node_id='DELIVERY', status='processing', details=f'{client_name}: Processando {total} funis...')
            t.pending_contacts = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or '')) for c in contacts]
            t.processed_contacts = []
            db_init.commit()
            c_id = t.client_id
            sent_phones_set = await get_sent_phones_set(db_init, trigger_id)
    finally:
        db_init.close()

    async def execute_item(c, blocked_list, blocked_suffixes):
        phone_raw = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or c.get('meta', {}).get('sender', {}).get('phone_number') or '')
        phone = normalize_phone(phone_raw)
        
        name = ""
        if isinstance(c, dict):
            name = c.get('{{1}}') or c.get('1') or c.get('name') or c.get('nome') or c.get('cliente') or ""

        # 1. Validação de Telefone
        if not phone:
            return {"status": "failed", "phone": phone_raw or "Desconhecido", "reason": "Telefone inválido ou ausente."}

        if phone in sent_phones_set:
            return {"status": "skipped", "phone": phone, "reason": "Já enviado nesta sessão."}

        # 2. Check de Bloqueio
        is_blocked = phone in blocked_list or any(phone.endswith(s) for s in blocked_suffixes)
        if is_blocked:
            return {"status": "blocked", "phone": phone, "name": name, "reason": "Contato na lista de bloqueio."}
        
        # 3. Execução do Funil
        db_item = SessionLocal()
        try:
            conv_id = (c.get('id') or c.get('conversation_id') or 0) if isinstance(c, dict) else 0
            await execute_funnel(funnel_id, conv_id, trigger_id, phone, db_item)
            return {"status": "sent", "phone": phone}
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Error executing funnel for {phone}: {err_msg}")
            return {"status": "failed", "phone": phone, "name": name, "reason": f"Erro na execução: {err_msg}"}
        finally:
            db_item.close()

    for i in range(0, total, concurrency):
        db_check = SessionLocal()
        try:
            t = db_check.query(models.ScheduledTrigger).get(trigger_id)
            if not t or t.status in ['cancelled', 'cancelling', 'deleted_pending']:
                if t and t.status == 'deleted_pending': db_check.delete(t)
                db_check.commit()
                return
            
            while t and t.status == 'paused':
                db_check.close()
                await asyncio.sleep(5)
                db_check = SessionLocal()
                t = db_check.query(models.ScheduledTrigger).get(trigger_id)

            blocked_raw = db_check.query(models.BlockedContact.phone).filter_by(client_id=c_id).all()
            blocked_list = {normalize_phone(b[0]) for b in blocked_raw}
            blocked_suffixes = {p[-8:] for p in blocked_list if len(p) >= 8}
            db_check.commit()
        finally:
            db_check.close()

        batch = contacts[i:i + concurrency]
        tasks = [execute_item(c, blocked_list, blocked_suffixes) for c in batch]
        results = await asyncio.gather(*tasks)
        
        db_persist = SessionLocal()
        try:
            for r in results:
                if not r: continue
                if r["status"] == "sent":
                    sent_count += 1
                elif r["status"] == "blocked":
                    # Registrar bloqueio se necessário
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_blocked = COALESCE(total_blocked, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                elif r["status"] == "failed":
                    failed_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    # CRIAR REGISTRO DE FALHA PARA O RELATÓRIO
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=r["phone"],
                        status='failed',
                        failure_reason=r.get("reason", "Erro desconhecido"),
                        content=f"Falha no Funil: {funnel_id}"
                    )
                    db_persist.add(fail_msg)
            db_persist.commit()
        except Exception as e:
            logger.error(f"Erro ao persistir estatísticas do batch: {e}")
            db_persist.rollback()
        finally:
            db_persist.close()
        
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
                    "total": total,
                    "total_contacts": total
                })
        finally:
            db_progress.close()
            
        if i + concurrency < total: await asyncio.sleep(delay)

    db_final = SessionLocal()
    try:
        t = db_final.query(models.ScheduledTrigger).get(trigger_id)
        if t and t.status != 'cancelled':
            t.status = 'completed' if failed_count == 0 else 'processed'
            t.total_sent = sent_count
            t.total_failed = failed_count
            from services.engine import log_node_execution
            log_node_execution(db_final, t, node_id='DELIVERY', status='completed')
            db_final.commit()
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "status": t.status,
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
                "total": total,
                "total_contacts": total
            })
    finally:
        db_final.close()

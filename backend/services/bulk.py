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
import random
from datetime import datetime, timezone, timedelta
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
            
            # Blocked list (guarda tanto o telefone normalizado quanto o sufixo de 8 dígitos)
            blocked_raw = db_check.query(models.BlockedContact.phone).filter_by(client_id=c_id).all()
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
                models.RestingContact.client_id == c_id,
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
        meta_instability_triggered = False
        meta_instability_reason = ""
        
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
                    # Deletar qualquer log anterior deste contato neste disparo para evitar duplicidade de estatísticas
                    existing_status = db_msg.query(models.MessageStatus).filter_by(trigger_id=trigger_id, phone_number=meta["phone"]).first()
                    if existing_status:
                        # Decrementar o contador estatístico correspondente
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
                        db_msg.add(msg_status)
                        db_msg.commit()
                        
                        update_trigger_stats(db_msg, trigger_id, sent=1)
                        sent_count += 1
                        sent_message_ids.append(message_id)
                    else:
                        # CRIAR REGISTRO DE FALHA PARA O RELATÓRIO
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
            
            # Disparar simulação de ciclo de vida assíncrona se SIMULATE_MESSAGING estiver ativo
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
            
            pdata = dict(t.processed_data or {})
            pdata["started_at"] = datetime.utcnow().isoformat()
            pdata.pop("finished_at", None)
            t.processed_data = pdata
            
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
            
            t_parent = db_item.query(models.ScheduledTrigger).get(trigger_id)
            child_trigger = models.ScheduledTrigger(
                client_id=c_id,
                funnel_id=funnel_id,
                conversation_id=conv_id,
                contact_phone=phone,
                contact_name=name,
                status='processing',
                scheduled_time=datetime.now(timezone.utc),
                is_bulk=False,
                parent_id=trigger_id,
                product_name="HIDDEN_CHILD",
                chatwoot_label=t_parent.chatwoot_label if t_parent else None,
                private_message=t_parent.private_message if t_parent else None,
                private_message_delay=t_parent.private_message_delay if t_parent else 5,
                private_message_concurrency=t_parent.private_message_concurrency if t_parent else 1
            )
            db_item.add(child_trigger)
            db_item.commit()
            db_item.refresh(child_trigger)
            
            # Criar registro inicial de status de mensagem para aparecer no "Ver Enviados" imediatamente
            init_status = models.MessageStatus(
                trigger_id=child_trigger.id,
                message_id=f"funnel_init_{child_trigger.id}",
                phone_number=phone,
                contact_name=name or phone,
                status='sent',
                message_type='FREE_MESSAGE',
                content=f"[Funil Iniciado] {t_parent.funnel.name if t_parent and t_parent.funnel else 'Funil'}"
            )
            db_item.add(init_status)
            db_item.commit()
            
            await execute_funnel(funnel_id, conv_id, child_trigger.id, phone, db_item)
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
            
            # Atualizar heartbeat a cada iteração do funil
            pdata = dict(t.processed_data or {})
            pdata["last_heartbeat"] = datetime.utcnow().isoformat()
            t.processed_data = pdata
            db_check.commit()
            
            while t and t.status == 'paused':
                # Atualizar heartbeat enquanto pausado
                pdata = dict(t.processed_data or {})
                pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                t.processed_data = pdata
                db_check.commit()
                db_check.close()
                await asyncio.sleep(5)
                db_check = SessionLocal()
                t = db_check.query(models.ScheduledTrigger).get(trigger_id)

            blocked_raw = db_check.query(models.BlockedContact.phone).filter_by(client_id=c_id).all()
            blocked_list = {normalize_phone(b[0]) for b in blocked_raw}
            
            # Add resting contacts
            now = datetime.utcnow()
            resting_raw = db_check.query(models.RestingContact.phone).filter(
                models.RestingContact.client_id == c_id,
                models.RestingContact.expires_at > now
            ).all()
            for r in resting_raw:
                blocked_list.add(normalize_phone(r[0]))

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
                if r["status"] == "sent":
                    sent_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_sent = COALESCE(total_sent, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                elif r["status"] == "blocked":
                    failed_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=r["phone"],
                        status='failed',
                        failure_reason=r.get("reason", "Contato na lista de bloqueio."),
                        content=f"Falha no Funil: {funnel_id}"
                    )
                    db_persist.add(fail_msg)
                elif r["status"] == "skipped":
                    failed_count += 1
                    db_persist.execute(text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    fail_msg = models.MessageStatus(
                        trigger_id=trigger_id,
                        phone_number=r["phone"],
                        status='failed',
                        failure_reason=r.get("reason", "Duplicidade de contato ou já enviado."),
                        content=f"Falha no Funil: {funnel_id}"
                    )
                    db_persist.add(fail_msg)
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
                    "total_paid_templates": t_prog.total_paid_templates or 0,
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
            from services.engine import log_node_execution
            log_node_execution(db_final, t, node_id='DELIVERY', status='completed')
            # Refresh / re-get the trigger to avoid losing changes due to db.expire in log_node_execution
            t = db_final.query(models.ScheduledTrigger).get(trigger_id)
            if t:
                pdata = dict(t.processed_data or {})
                pdata["finished_at"] = datetime.utcnow().isoformat()
                t.processed_data = pdata
                t.status = 'completed' if failed_count == 0 else 'processed'
                t.total_sent = sent_count
                t.total_failed = failed_count
                db_final.commit()
            
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger_id,
                "status": t.status,
                "processed_data": t.processed_data,
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

async def simulate_lifecycle(message_id: str, trigger_id: int, client_id: int):
    from database import SessionLocal
    import models
    from rabbitmq_client import rabbitmq

    logger.info(f"🔄 [SIMULATE] Iniciando simulação para message_id={message_id}, trigger_id={trigger_id}")

    # 1. Simular entrega (delivered) - ~90% de sucesso
    await asyncio.sleep(random.uniform(1.0, 3.0))
    
    db = SessionLocal()
    try:
        msg = db.query(models.MessageStatus).filter_by(message_id=message_id).first()
        if not msg:
            logger.warning(f"⚠️ [SIMULATE] Mensagem {message_id} não encontrada no banco para o Trigger {trigger_id}.")
            return
        
        trigger = db.query(models.ScheduledTrigger).filter_by(id=trigger_id).first()
        
        # 90% chance to deliver
        if random.random() < 0.90:
            msg.status = 'delivered'
            msg.delivered_counted = True
            
            # Decidir se é pago ou grátis para simulação
            is_paid = False
            price_brl = 0.0
            category = "service"
            
            if trigger and not trigger.is_free_message and (trigger.template_name or trigger.product_name == "SCALE_TEST"):
                # 70% de chance de ser cobrado, para o usuário poder ver ambos os tipos
                if random.random() < 0.70:
                    is_paid = True
                    price_brl = trigger.cost_per_unit or 0.35
                    category = "marketing" if price_brl == 0.35 else "utility"
                else:
                    is_paid = False
                    price_brl = 0.0
                    category = "utility" # categoria de template gratuito
            
            msg.meta_price_brl = price_brl
            msg.meta_price_category = category
            msg.updated_at = datetime.now(timezone.utc)
            db.commit()
            
            # Increment trigger total_delivered e custos se aplicável
            db.execute(text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
            if is_paid:
                db.execute(
                    text("UPDATE scheduled_triggers SET total_cost = COALESCE(total_cost, 0) + :cost, total_paid_templates = COALESCE(total_paid_templates, 0) + 1 WHERE id = :tid"),
                    {"cost": price_brl, "tid": trigger_id}
                )
            db.commit()
            
            # notify progress
            await notify_progress(db, trigger_id)
            
            # 2. Simular visualização (read) - ~75% de chance se entregue
            await asyncio.sleep(random.uniform(2.0, 5.0))
            db.refresh(msg)
            if random.random() < 0.75:
                msg.status = 'read'
                msg.read_counted = True
                msg.updated_at = datetime.now(timezone.utc)
                db.commit()
                
                # Increment trigger total_read
                db.execute(text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                db.commit()
                
                await notify_progress(db, trigger_id)
                
                # 3. Simular interação ou bloqueio
                await asyncio.sleep(random.uniform(2.0, 5.0))
                db.refresh(msg)
                rand_val = random.random()
                if rand_val < 0.35: # ~35% de chance de interação
                    msg.status = 'interaction'
                    msg.is_interaction = True
                    msg.interaction_counted = True
                    msg.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    
                    # Increment trigger total_interactions
                    db.execute(text("UPDATE scheduled_triggers SET total_interactions = COALESCE(total_interactions, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    db.commit()
                    
                    await notify_progress(db, trigger_id)

                    # Se houver interaction_funnel_id configurado, disparar o funil simulado
                    if trigger and trigger.interaction_funnel_id:
                        try:
                            new_trig = models.ScheduledTrigger(
                                client_id=client_id,
                                funnel_id=trigger.interaction_funnel_id,
                                contact_phone=msg.phone_number,
                                contact_name=msg.contact_name or "Contato Simulado",
                                status='processing',
                                scheduled_time=datetime.now(timezone.utc),
                                is_bulk=False,
                                is_interaction=True,
                                parent_id=trigger_id
                            )
                            db.add(new_trig)
                            db.commit()
                            db.refresh(new_trig)
                            
                            await rabbitmq.publish("zapvoice_funnel_executions", {
                                "trigger_id": new_trig.id,
                                "funnel_id": trigger.interaction_funnel_id,
                                "contact_phone": msg.phone_number
                            })
                            logger.info(f"🚀 [SIMULATE] Funil de interação {trigger.interaction_funnel_id} iniciado para {msg.phone_number}")
                        except Exception as e_funnel:
                            logger.error(f"❌ [SIMULATE] Erro ao disparar funil de interação simulado: {e_funnel}")
                elif rand_val < 0.43: # ~8% de chance de bloqueio
                    msg.status = 'delivered' # mantem delivered
                    msg.failure_reason = 'BLOCKED_VIA_BUTTON'
                    msg.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    
                    # Increment trigger total_blocked
                    db.execute(text("UPDATE scheduled_triggers SET total_blocked = COALESCE(total_blocked, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
                    db.commit()
                    
                    await notify_progress(db, trigger_id)

                    # Se houver block_funnel_id configurado, disparar o funil simulado
                    if trigger and trigger.block_funnel_id:
                        try:
                            new_trig = models.ScheduledTrigger(
                                client_id=client_id,
                                funnel_id=trigger.block_funnel_id,
                                contact_phone=msg.phone_number,
                                contact_name=msg.contact_name or "Contato Simulado",
                                status='processing',
                                scheduled_time=datetime.now(timezone.utc),
                                is_bulk=False,
                                is_interaction=False,
                                skip_block_check=True,
                                parent_id=trigger_id
                            )
                            db.add(new_trig)
                            db.commit()
                            db.refresh(new_trig)
                            
                            await rabbitmq.publish("zapvoice_funnel_executions", {
                                "trigger_id": new_trig.id,
                                "funnel_id": trigger.block_funnel_id,
                                "contact_phone": msg.phone_number
                            })
                            logger.info(f"🚀 [SIMULATE] Funil de bloqueio {trigger.block_funnel_id} iniciado para {msg.phone_number}")
                        except Exception as e_funnel:
                            logger.error(f"❌ [SIMULATE] Erro ao disparar funil de bloqueio simulado: {e_funnel}")
        else:
            logger.info(f"❌ [SIMULATE] Simulando falha de entrega para message_id={message_id}")
            msg.status = 'failed'
            
            reasons = None
            if trigger and trigger.processed_data and isinstance(trigger.processed_data, dict):
                reasons = trigger.processed_data.get("simulated_error_reasons")
                
            if not reasons or not isinstance(reasons, list) or len(reasons) == 0:
                reasons = [
                    "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade.",
                    "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema.",
                    "Erro Meta 131026: Mensagem não entregável",
                    "Lista de Exclusão (Bloqueado)"
                ]
                
            selected_reason = translate_meta_error(random.choice(reasons))
                
            msg.failure_reason = selected_reason
            msg.updated_at = datetime.now(timezone.utc)
            db.commit()
            
            db.execute(text("UPDATE scheduled_triggers SET total_sent = COALESCE(total_sent, 1) - 1, total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"), {"tid": trigger_id})
            db.commit()
            
            # Se o template foi pausado por baixa qualidade, aborta o disparo
            if "132015" in msg.failure_reason or "paused due to low quality" in msg.failure_reason:
                if trigger:
                    trigger.status = 'aborted'
                    trigger.failure_reason = msg.failure_reason
                    db.commit()
                    logger.error(f"🛑 [ABORT - SIMULATE] Disparo {trigger_id} abortado. Template pausado por baixa qualidade.")
            
            await notify_progress(db, trigger_id)
    except Exception as e:
        logger.error(f"Erro na simulação de ciclo de vida do wamid {message_id}: {e}")
    finally:
        db.close()

async def notify_progress(db, trigger_id):
    db.commit()
    t_prog = db.query(models.ScheduledTrigger).get(trigger_id)
    if t_prog:
        # Calcular queue_count via SQL real para garantir consistência com o modal de fila
        try:
            from sqlalchemy import func
            # Para bulk: subquery agrupada por telefone (pega último registro por phone)
            if t_prog.is_bulk:
                subquery = db.query(func.max(models.MessageStatus.id)).filter(
                    models.MessageStatus.trigger_id == trigger_id
                ).group_by(models.MessageStatus.phone_number).subquery()
                queue_count = db.query(models.MessageStatus).filter(
                    models.MessageStatus.id.in_(subquery),
                    models.MessageStatus.status == 'sent',
                    models.MessageStatus.delivered_counted == False,
                    models.MessageStatus.read_counted == False
                ).count()
            else:
                queue_count = db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.status == 'sent',
                    models.MessageStatus.delivered_counted == False,
                    models.MessageStatus.read_counted == False
                ).count()
        except Exception:
            # Fallback: cálculo estimado baseado nos contadores do trigger
            queue_count = max(0, (t_prog.total_sent or 0) - (t_prog.total_delivered or 0) - (t_prog.total_failed or 0))

        await rabbitmq.publish_event("bulk_progress", {
            "trigger_id": trigger_id,
            "status": t_prog.status,
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
            "total": t_prog.total_contacts or 0,
            "total_contacts": t_prog.total_contacts or 0,
            "queue_count": queue_count
        })


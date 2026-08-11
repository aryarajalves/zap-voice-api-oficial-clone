import asyncio
import models
from database import SessionLocal
from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from core.logger import setup_logger
from services.utils.bulk_helpers import render_template_body, extract_body_from_components, resolve_template_body_with_sync
from services.utils.phone_utils import normalize_phone
from services.bulk_persistence import get_sent_phones_set, update_trigger_stats, record_blocked_status, record_skipped_status
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

async def refresh_dynamic_label_contacts(init_trig, db = None, chatwoot = None) -> list:
    """
    Se o trigger estiver configurado como is_dynamic_label=True, busca a lista
    de contatos mais recente da tabela de Contatos (WebhookLead - Aba de Contatos)
    no banco de dados local para a etiqueta especificada (ex: 'aryaraj'), com fallback para o Chatwoot.
    """
    if not getattr(init_trig, "is_dynamic_label", False):
        return None

    label_name = getattr(init_trig, "dynamic_label_name", None)
    if not label_name and init_trig.chatwoot_label:
        if isinstance(init_trig.chatwoot_label, list) and len(init_trig.chatwoot_label) > 0:
            label_name = init_trig.chatwoot_label[0]
        elif isinstance(init_trig.chatwoot_label, str):
            label_name = init_trig.chatwoot_label

    if not label_name:
        return None

    clean_label = label_name.strip()
    new_contacts = []
    seen_phones = set()

    # 1. Buscar primariamente na tabela de Contatos local (WebhookLead - Aba de Contatos)
    if db is not None:
        try:
            from models import WebhookLead
            from sqlalchemy import func

            leads = db.query(WebhookLead).filter(
                WebhookLead.client_id == init_trig.client_id,
                func.concat(',', func.replace(func.coalesce(WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{clean_label},%")
            ).all()

            for l in leads:
                if l.phone:
                    phone_digits = "".join(filter(str.isdigit, str(l.phone)))
                    if len(phone_digits) >= 8 and phone_digits not in seen_phones:
                        seen_phones.add(phone_digits)
                        new_contacts.append({
                            "phone": phone_digits,
                            "name": l.name or "",
                            "email": l.email or ""
                        })
            if new_contacts:
                logger.info(f"🔄 [DYNAMIC LABEL - ABA CONTATOS] Encontrados {len(new_contacts)} contatos locais com a etiqueta '{clean_label}' no trigger {init_trig.id}")
        except Exception as e_local:
            logger.error(f"⚠️ Erro ao consultar a Aba de Contatos para a etiqueta '{clean_label}': {e_local}")

    # 2. Fallback / Suplemento Chatwoot se ativado e não encontrou no banco local
    if not new_contacts and chatwoot is not None:
        try:
            cw_contacts = await chatwoot.get_contacts_by_label(clean_label)
            if cw_contacts and isinstance(cw_contacts, list):
                for c in cw_contacts:
                    phone_raw = c.get("phone_number") or c.get("phone") or ""
                    phone_digits = "".join(filter(str.isdigit, str(phone_raw)))
                    if len(phone_digits) >= 8 and phone_digits not in seen_phones:
                        seen_phones.add(phone_digits)
                        new_contacts.append({
                            "phone": phone_digits,
                            "name": c.get("name") or "",
                            "email": c.get("email") or ""
                        })
                if new_contacts:
                    logger.info(f"🔄 [DYNAMIC LABEL - CHATWOOT] Encontrados {len(new_contacts)} contatos no Chatwoot com a etiqueta '{clean_label}'")
        except Exception as e_cw:
            logger.error(f"⚠️ Erro ao consultar Chatwoot para a etiqueta dinâmica '{clean_label}': {e_cw}")

    return new_contacts if new_contacts else None

async def sync_queued_dynamic_triggers(db, client_id: int):
    """
    Sincroniza os contatos de todos os disparos com is_dynamic_label=True no status 'queued'
    para o client_id informado.
    """
    try:
        queued_dynamic = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.status == 'queued',
            models.ScheduledTrigger.is_dynamic_label == True
        ).all()

        if not queued_dynamic:
            return

        from chatwoot_client import ChatwootClient
        chatwoot = ChatwootClient(client_id=client_id)
        changed = False

        for trig in queued_dynamic:
            new_contacts = await refresh_dynamic_label_contacts(trig, db=db, chatwoot=chatwoot)
            if new_contacts is not None:
                trig.contacts_list = new_contacts
                trig.total_contacts = len(new_contacts)
                changed = True

        if changed:
            db.commit()
    except Exception as e:
        logger.error(f"⚠️ Erro ao sincronizar contatos de disparos dinâmicos em fila: {e}")

async def process_bulk_send(trigger_id: int, template_name: str, contacts: list, delay: int, concurrency: int, language: str = 'pt_BR', components: list = None, direct_message: str = None, direct_message_params: dict = None):

    logger.info(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language} | DM: {bool(direct_message)}")
    
    # Initialize tracking and client
    db_init = SessionLocal()
    try:
        init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
        if not init_trig:
             return logger.error(f"ScheduledTrigger {trigger_id} not found")
             
        chatwoot = ChatwootClient(client_id=init_trig.client_id)
        is_stress_test_flag = getattr(init_trig, 'is_stress_test', False) or (init_trig.product_name == 'SCALE_TEST')
        if is_stress_test_flag:
            chatwoot.simulate = True
        import os
        is_simulate_messaging = is_stress_test_flag or getattr(chatwoot, 'simulate', False) or os.getenv("SIMULATE_MESSAGING", "false").lower() in ("true", "1", "yes")

        # Se for um agendamento dinâmico por etiqueta, recarrega os contatos atualizados da Aba de Contatos (WebhookLead)
        updated_dynamic_contacts = await refresh_dynamic_label_contacts(init_trig, db=db_init, chatwoot=chatwoot)
        if updated_dynamic_contacts is not None:
            contacts = updated_dynamic_contacts


        if not contacts:
            init_trig.status = "completed"
            init_trig.total_sent = 0
            init_trig.total_failed = 0
            db_init.commit()
            return

        total = len(contacts)
        all_phones = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in contacts]
        
        init_trig.contacts_list = contacts
        init_trig.pending_contacts = all_phones
        init_trig.processed_contacts = []
        init_trig.total_sent = init_trig.total_failed = init_trig.total_blocked = 0
        init_trig.total_contacts = total
        
        # Guardar o timestamp de início (preserva se já existir para não zerar o cronômetro no resume)
        pdata = dict(init_trig.processed_data or {})
        if "started_at" not in pdata:
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
    
    # Pre-fetch de contatos bloqueados e em descanso (uma única vez no início do disparo)
    db_check_init = SessionLocal()
    blocked_set = set()
    try:
        client_ids = [c_id]
        client = db_check_init.query(models.Client).filter(models.Client.id == c_id).first()
        if client and client.project_id:
            sibling_clients = db_check_init.query(models.Client.id).filter(models.Client.project_id == client.project_id).all()
            client_ids = [c.id for c in sibling_clients]

        blocked_raw = db_check_init.query(models.BlockedContact.phone).filter(
            models.BlockedContact.client_id.in_(client_ids)
        ).all()
        for b in blocked_raw:
            p_norm = normalize_phone(b[0])
            if p_norm:
                blocked_set.add(p_norm)
                if len(p_norm) >= 8:
                    blocked_set.add(p_norm[-8:])
        
        now = datetime.utcnow()
        resting_raw = db_check_init.query(models.RestingContact.phone).filter(
            models.RestingContact.client_id.in_(client_ids),
            models.RestingContact.expires_at > now
        ).all()
        for r in resting_raw:
            p_norm = normalize_phone(r[0])
            if p_norm:
                blocked_set.add(p_norm)
                if len(p_norm) >= 8:
                    blocked_set.add(p_norm[-8:])
                    
        # Carregar contatos da lista de exclusão do disparo (Filtro de Exclusão)
        if init_trig and init_trig.exclusion_list:
            for excl in init_trig.exclusion_list:
                p_norm = normalize_phone(excl)
                if p_norm:
                    blocked_set.add(p_norm)
                    if len(p_norm) >= 8:
                        blocked_set.add(p_norm[-8:])
    except Exception as e_prefetch_block:
        logger.error(f"⚠️ [BULK] Erro ao carregar contatos bloqueados/descanso/exclusao: {e_prefetch_block}")
    finally:
        db_check_init.close()

    all_sim_tasks = []
    try:
        i = 0
        while i < len(contacts):
            db_check = SessionLocal()
            try:
                current_trig = db_check.query(models.ScheduledTrigger).get(trigger_id)
                if not current_trig or current_trig.status in ['cancelled', 'deleted_pending', 'aborted', 'failed']:
                    if current_trig and current_trig.status == 'deleted_pending':
                        db_check.delete(current_trig)
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
                    if not current_trig or current_trig.status == 'cancelled': return

                batch = contacts[i:i + concurrency]
                batch_phones_norm = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in batch]
                
                # Update tracking
                current_trig.processed_contacts = list(set((current_trig.processed_contacts or []) + batch_phones_norm))
                current_trig.pending_contacts = [p for p in all_phones if p not in current_trig.processed_contacts]
                
                sent_phones_set = await get_sent_phones_set(db_check, trigger_id)
                db_check.commit()
            except Exception as e_check:
                logger.error(f"❌ [BULK] Erro ao atualizar heartbeat/tracking: {e_check}")
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

            if not tasks:
                i += concurrency
                continue

            results = await asyncio.gather(*tasks, return_exceptions=True)
            
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
                    
                    if isinstance(res, Exception):
                        fail_msg = models.MessageStatus(
                            trigger_id=trigger_id,
                            phone_number=meta["phone"],
                            status='failed',
                            failure_reason=str(res),
                            content=f"[Falha no Envio] {template_name or 'Mensagem Direta'}"
                        )
                        db_msg.add(fail_msg)
                        db_msg.commit()
                        update_trigger_stats(db_msg, trigger_id, failed=1)
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
                            
                            tpl_media_url = None
                            if meta.get("components"):
                                for comp in meta["components"]:
                                    if str(comp.get("type", "")).lower() == "header":
                                        params = comp.get("parameters", [])
                                        for param in params:
                                            param_type = str(param.get("type", "")).lower()
                                            if param_type in ["image", "video", "document"]:
                                                media_data = param.get(param_type, {})
                                                if isinstance(media_data, dict):
                                                    tpl_media_url = media_data.get("link") or media_data.get("url")

                            vars_dict = dict(meta.get("vars", {}))
                            if tpl_media_url:
                                vars_dict["var5"] = tpl_media_url

                            msg_status = models.MessageStatus(
                                trigger_id=trigger_id, message_id=message_id, phone_number=meta["phone"],
                                contact_name=meta.get("name") or "",
                                status='sent', message_type=msg_type, content=content, template_name=template_name,
                                **vars_dict
                            )
                            db_msg.add(msg_status)
                            db_msg.commit()
                            
                            update_trigger_stats(db_msg, trigger_id, sent=1)
                            sent_message_ids.append(message_id)
                        else:
                            # Verificar se é um skip de 24h (não é falha real)
                            is_skipped_24h = isinstance(res, dict) and res.get("skipped_24h") is True
                            if is_skipped_24h:
                                record_skipped_status(trigger_id, meta["phone"])
                                update_trigger_stats(db_msg, trigger_id, skipped=1)
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
                
                if is_simulate_messaging:
                    for mid in sent_message_ids:
                        all_sim_tasks.append(asyncio.create_task(simulate_lifecycle(mid, trigger_id, c_id)))
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

            # Cancelamento gracioso: verificar APÓS o batch terminar, não antes
            db_cancel_check = SessionLocal()
            try:
                trig_cancel = db_cancel_check.query(models.ScheduledTrigger).get(trigger_id)
                if trig_cancel and trig_cancel.status == 'deleted_pending':
                    db_cancel_check.delete(trig_cancel)
                    db_cancel_check.commit()
                    logger.info(f"🗑️ [BULK] Disparo #{trigger_id} deletado pelo usuário. Encerrando worker.")
                    return
                if trig_cancel and trig_cancel.status == 'cancelling':
                    from services.engine import log_node_execution
                    trig_cancel.status = 'cancelled'
                    log_node_execution(db_cancel_check, trig_cancel, node_id=trig_cancel.current_node_id or 'DELIVERY',
                                       status='cancelled', details='Disparo cancelado pelo usuário. Batch atual foi concluído antes de encerrar.')
                    db_cancel_check.commit()
                    logger.info(f"🛑 [BULK] Disparo #{trigger_id} cancelado graciosamente após batch.")
                    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "cancelled", "client_id": c_id})
                    return
            except Exception as e_cancel:
                logger.error(f"❌ [BULK] Erro ao verificar cancelamento gracioso: {e_cancel}")
            finally:
                db_cancel_check.close()

            i += concurrency
            if i < len(contacts): await asyncio.sleep(delay)

        # Aguardar tarefas de simulação de ciclo de vida (se houver) antes de marcar como completed
        if all_sim_tasks:
            logger.info(f"⏳ [SIMULATE] Aguardando conclusão da simulação de ciclo de vida ({len(all_sim_tasks)} tarefas) para o Trigger #{trigger_id}...")
            await asyncio.gather(*all_sim_tasks, return_exceptions=True)

        # Finalize
        db_final = SessionLocal()
        try:
            t = db_final.query(models.ScheduledTrigger).get(trigger_id)
            if t and t.status == 'cancelling':
                # Cancelamento solicitado mas todos os contatos já foram processados — finaliza como cancelado
                from services.engine import log_node_execution
                log_node_execution(db_final, t, node_id=t.current_node_id or 'DELIVERY',
                                   status='cancelled', details='Disparo cancelado pelo usuário. Todos os contatos do último batch foram processados antes do encerramento.')
                t.status = 'cancelled'
                db_final.commit()
                logger.info(f"🛑 [BULK] Disparo #{trigger_id} finalizado como cancelado (todos os batches já tinham sido processados).")
                await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "cancelled", "client_id": c_id})
            elif t and t.status not in ['cancelled']:
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

    except Exception as e_fatal_bulk:
        logger.error(f"❌ [BULK_FATAL_ERROR] Exceção não tratada no disparo #{trigger_id}: {e_fatal_bulk}")
        db_recovery = SessionLocal()
        try:
            t_rec = db_recovery.query(models.ScheduledTrigger).get(trigger_id)
            if t_rec and t_rec.status == 'processing':
                t_rec.status = 'completed' if (t_rec.total_sent or 0) > 0 else 'failed'
                t_rec.failure_reason = f"Erro de processamento: {str(e_fatal_bulk)}"
                db_recovery.commit()
                logger.info(f"🛡️ [RECOVERY] Status do Trigger #{trigger_id} atualizado para '{t_rec.status}' após erro fatal.")
        except Exception as e_rec:
            logger.error(f"❌ [RECOVERY_FAILED] Erro ao recuperar trigger em exceção fatal: {e_rec}")
        finally:
            db_recovery.close()

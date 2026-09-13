import asyncio
import os
import zoneinfo
from datetime import datetime, timezone, timedelta

import models
import database


def SessionLocal():
    return database.SessionLocal()


from chatwoot_client import ChatwootClient
from rabbitmq_client import rabbitmq
from config_loader import get_setting
from core.logger import setup_logger
from services.utils.bulk_helpers import render_template_body, extract_body_from_components, resolve_template_body_with_sync
from services.utils.phone_utils import normalize_phone
from services.bulk_persistence import get_sent_phones_set, update_trigger_stats, record_blocked_status, record_skipped_status
from services.bulk_core import send_smart_message, _extract_header_media

# Re-exportações para compatibilidade retrógrada (Padrão Barrel)
from services.bulk_funnel import process_bulk_funnel
from services.bulk_simulation import simulate_lifecycle, notify_progress
from services.bulk_errors import translate_meta_error
from services.bulk_dynamic_labels import refresh_dynamic_label_contacts, sync_queued_dynamic_triggers
from services.bulk_dispatch_helpers import (
    sanitize_and_deduplicate_contacts,
    check_initial_deadline_expiration,
    prefetch_blocked_and_resting,
    check_batch_deadline_expiration,
    extract_contact_vars,
    build_progress_payload,
    BRAZIL_TZ,
)

logger = setup_logger(__name__)


async def process_bulk_send(
    trigger_id: int,
    template_name: str,
    contacts: list,
    delay: int,
    concurrency: int,
    language: str = 'pt_BR',
    components: list = None,
    direct_message: str = None,
    direct_message_params: dict = None,
    db=None
):
    logger.info(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language} | DM: {bool(direct_message)}")

    # 1. Inicialização do Trigger e cliente de envio
    db_init = db or SessionLocal()
    should_close_init = (db is None)
    try:
        init_trig = db_init.query(models.ScheduledTrigger).get(trigger_id)
        if not init_trig:
            return logger.error(f"ScheduledTrigger {trigger_id} not found")

        chatwoot = ChatwootClient(client_id=init_trig.client_id)

        is_stress_test_flag = (getattr(init_trig, 'is_stress_test', False) is True) or (getattr(init_trig, 'product_name', None) == 'SCALE_TEST')
        if is_stress_test_flag:
            chatwoot.simulate = True
        is_simulate_messaging = is_stress_test_flag or (getattr(chatwoot, 'simulate', False) is True) or (os.getenv("SIMULATE_MESSAGING", "false").lower() in ("true", "1", "yes"))

        # Se for um agendamento dinâmico por etiqueta, recarrega os contatos atualizados
        updated_dynamic_contacts = await refresh_dynamic_label_contacts(init_trig, db=db_init)
        if updated_dynamic_contacts is not None:
            contacts = updated_dynamic_contacts

        # Higienização e deduplicação preventiva
        contacts, duplicates_removed, invalid_removed = sanitize_and_deduplicate_contacts(contacts, trigger_id)

        if not contacts:
            if init_trig:
                init_trig.status = "completed"
                init_trig.total_sent = 0
                init_trig.total_failed = 0
            db_init.query(models.ScheduledTrigger).filter_by(id=trigger_id).update({
                "status": "completed", "total_sent": 0, "total_failed": 0
            })
            db_init.commit()
            return

        # Checagem de prazo limite antes do início
        if check_initial_deadline_expiration(init_trig, contacts, template_name, db_init, trigger_id):
            return

        total = len(contacts)
        all_phones = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in contacts]

        init_trig.contacts_list = contacts
        init_trig.pending_contacts = all_phones
        init_trig.processed_contacts = []
        init_trig.total_sent = init_trig.total_failed = init_trig.total_blocked = 0
        init_trig.total_contacts = total

        # Timestamp de início (preserva se já existir no resume)
        pdata = dict(init_trig.processed_data or {})
        if "started_at" not in pdata:
            pdata["started_at"] = datetime.utcnow().isoformat()
        pdata.pop("finished_at", None)
        if duplicates_removed > 0:
            pdata["duplicates_removed"] = duplicates_removed
        if invalid_removed > 0:
            pdata["invalid_removed"] = invalid_removed
        init_trig.processed_data = pdata

        c_label = init_trig.chatwoot_label
        c_id = init_trig.client_id
        trig_exclusion_list = list(init_trig.exclusion_list or []) if getattr(init_trig, 'exclusion_list', None) else []

        from services.engine import log_node_execution
        client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=init_trig.client_id)
        log_node_execution(db_init, init_trig, node_id='DISCOVERY', status='completed', details=f'{client_name}: Iniciando disparo em massa...')
        log_node_execution(db_init, init_trig, node_id='DELIVERY', status='processing', details=f'{client_name}: Enviando para {total} contatos...')
        db_init.commit()
    finally:
        if should_close_init:
            db_init.close()

    # 2. Pré-carregamento do cache do template
    template_body_cache = None
    template_btn_info = {"quick_replies": [], "has_special_buttons": False}
    if template_name and c_id:
        db_tmpl = SessionLocal()
        try:
            template_body_cache, template_btn_info = await resolve_template_body_with_sync(db_tmpl, c_id, template_name)
        finally:
            db_tmpl.close()

    # 3. Pré-carregamento de bloqueados, descanso e exclusão
    db_check_init = SessionLocal()
    try:
        blocked_set, sent_phones_set = await prefetch_blocked_and_resting(c_id, trig_exclusion_list, trigger_id, db_check_init)
    finally:
        db_check_init.close()

    # 4. Pré-aquecimento do Media ID da Meta para headers multimídia
    if components:
        header_media = _extract_header_media(components)
        if header_media:
            m_type, m_url = header_media
            try:
                logger.info(f"🚀 [BULK WARMUP] Pré-carregando mídia do header ({m_type}) para obter Media ID único na Meta: {m_url}")
                wa_client = getattr(chatwoot, "_wa", chatwoot)
                media_payload = {"link": m_url}
                if hasattr(wa_client, "_resolve_and_upload_media_param"):
                    await wa_client._resolve_and_upload_media_param(m_type, media_payload)
                    if media_payload.get("id"):
                        logger.info(f"✅ [BULK WARMUP] Media ID ({media_payload['id']}) obtido e armazenado em cache para todos os contatos!")
            except Exception as e_warm:
                logger.warning(f"⚠️ [BULK WARMUP] Não foi possível pré-aquecer mídia do template: {e_warm}")

    # 5. Loop de envio por lotes (concurrency)
    all_sim_tasks = []
    try:
        i = 0
        while i < len(contacts):
            db_batch = SessionLocal()
            try:
                current_trig = db_batch.query(models.ScheduledTrigger).get(trigger_id)
                if not current_trig or current_trig.status in ['cancelled', 'deleted_pending', 'aborted', 'failed']:
                    if current_trig and current_trig.status == 'deleted_pending':
                        db_batch.delete(current_trig)
                        db_batch.commit()
                    return

                # Atualizar heartbeat a cada iteração
                pdata = dict(current_trig.processed_data or {})
                pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                current_trig.processed_data = pdata
                db_batch.commit()

                # Espera se estiver pausado
                while current_trig and current_trig.status == 'paused':
                    pdata = dict(current_trig.processed_data or {})
                    pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                    current_trig.processed_data = pdata
                    db_batch.commit()
                    await asyncio.sleep(5)
                    db_batch.refresh(current_trig)
                    if not current_trig or current_trig.status == 'cancelled':
                        return

                # Checagem de expiração de prazo do lote
                if await check_batch_deadline_expiration(current_trig, contacts, i, sent_phones_set, template_name, c_id, db_batch, trigger_id, rabbitmq):
                    return

                batch = contacts[i:i + concurrency]
                batch_phones_norm = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in batch]

                windows = db_batch.query(models.ContactWindow).filter(
                    models.ContactWindow.client_id == c_id,
                    models.ContactWindow.phone.in_(batch_phones_norm)
                ).all()
                batch_interaction_map = {w.phone: w.last_interaction_at for w in windows}

                tasks = []
                batch_meta = []
                seen_in_batch = set()

                for c in batch:
                    phone_raw = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or c.get('whatsapp') or '')
                    phone = normalize_phone(phone_raw)
                    if not phone or phone in seen_in_batch or phone in sent_phones_set:
                        continue
                    seen_in_batch.add(phone)

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

                    cvars = extract_contact_vars(c, name)
                    per_contact_components = c.get('components') if isinstance(c, dict) else None

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

                sent_message_ids = []
                batch_sent = batch_failed = batch_blocked = batch_skipped = 0
                abort_disparo = False
                abort_reason = None

                for idx, res in enumerate(results):
                    meta = batch_meta[idx]
                    if meta["blocked"]:
                        batch_blocked += 1
                        continue

                    if isinstance(res, Exception):
                        fail_msg = models.MessageStatus(
                            trigger_id=trigger_id,
                            phone_number=meta["phone"],
                            status='failed',
                            failure_reason=str(res),
                            content=f"[Falha no Envio] {template_name or 'Mensagem Direta'}"
                        )
                        db_batch.add(fail_msg)
                        batch_failed += 1
                        continue

                    is_success = False
                    message_id = None
                    msg_type = res.get("type", "UNKNOWN") if isinstance(res, dict) else "UNKNOWN"

                    if isinstance(res, dict) and not res.get("error"):
                        raw_res = res.get("result") or res
                        message_id = (raw_res.get("messages", [{}])[0].get("id") or raw_res.get("id", "")).replace("wamid.", "")
                        if message_id:
                            is_success = True

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
                        db_batch.add(msg_status)
                        batch_sent += 1
                        sent_phones_set.add(meta["phone"])
                        sent_message_ids.append(message_id)
                    else:
                        is_skipped_24h = isinstance(res, dict) and res.get("skipped_24h") is True
                        if is_skipped_24h:
                            record_skipped_status(trigger_id, meta["phone"])
                            batch_skipped += 1
                        else:
                            reason = "Erro na API da Meta ou dados inválidos"
                            if isinstance(res, dict):
                                if res.get("detail"):
                                    reason = res.get("detail")
                                elif res.get("error"):
                                    err_val = res.get("error")
                                    reason = res.get("detail") or "Erro na API da Meta ou dados inválidos" if isinstance(err_val, bool) else str(err_val)
                            reason = translate_meta_error(reason)

                            fail_msg = models.MessageStatus(
                                trigger_id=trigger_id,
                                phone_number=meta["phone"],
                                status='failed',
                                failure_reason=reason,
                                content=f"[Falha no Envio] {template_name or 'Mensagem Direta'}"
                            )
                            db_batch.add(fail_msg)
                            batch_failed += 1

                            if "132015" in reason or "paused due to low quality" in reason:
                                abort_disparo = True
                                abort_reason = "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade."

                update_trigger_stats(db_batch, trigger_id, sent=batch_sent, failed=batch_failed, blocked=batch_blocked, skipped=batch_skipped, commit=False)

                if abort_disparo:
                    current_trig.status = 'aborted'
                    current_trig.failure_reason = abort_reason
                    logger.error(f"🛑 [ABORT] Disparo {trigger_id} abortado. Template pausado por baixa qualidade.")

                if current_trig.status == 'deleted_pending':
                    db_batch.delete(current_trig)
                    db_batch.commit()
                    logger.info(f"🗑️ [BULK] Disparo #{trigger_id} deletado pelo usuário. Encerrando worker.")
                    return

                if current_trig.status == 'cancelling':
                    from services.engine import log_node_execution
                    current_trig.status = 'cancelled'
                    log_node_execution(db_batch, current_trig, node_id=current_trig.current_node_id or 'DELIVERY',
                                       status='cancelled', details='Disparo cancelado pelo usuário. Batch atual foi concluído antes de encerrar.')
                    db_batch.commit()
                    logger.info(f"🛑 [BULK] Disparo #{trigger_id} cancelado graciosamente após batch.")
                    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "cancelled", "client_id": c_id})
                    return

                db_batch.commit()

                if is_simulate_messaging:
                    for mid in sent_message_ids:
                        all_sim_tasks.append(asyncio.create_task(simulate_lifecycle(mid, trigger_id, c_id)))

                db_batch.refresh(current_trig)
                await rabbitmq.publish_event("bulk_progress", build_progress_payload(trigger_id, c_id, current_trig, len(contacts)))

                if abort_disparo:
                    return

            finally:
                db_batch.close()

            i += concurrency
            if i < len(contacts):
                await asyncio.sleep(delay)

        # 6. Aguardar simulações de ciclo de vida se aplicável
        if all_sim_tasks:
            logger.info(f"⏳ [SIMULATE] Aguardando conclusão da simulação de ciclo de vida ({len(all_sim_tasks)} tarefas) para o Trigger #{trigger_id}...")
            await asyncio.gather(*all_sim_tasks, return_exceptions=True)

        # 7. Finalização do Disparo
        db_final = SessionLocal()
        try:
            t = db_final.query(models.ScheduledTrigger).get(trigger_id)
            if t and t.status == 'cancelling':
                from services.engine import log_node_execution
                log_node_execution(db_final, t, node_id=t.current_node_id or 'DELIVERY',
                                   status='cancelled', details='Disparo cancelado pelo usuário. Todos os contatos do último batch foram processados antes do encerramento.')
                t.status = 'cancelled'
                db_final.commit()
                logger.info(f"🛑 [BULK] Disparo #{trigger_id} finalizado como cancelado (todos os batches já tinham sido processados).")
                await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "cancelled", "client_id": c_id})
            elif t and t.status not in ['cancelled']:
                from services.triggers_service import reconcile_trigger_stats_logic
                try:
                    await reconcile_trigger_stats_logic(trigger_id, c_id, db_final)
                    db_final.refresh(t)
                except Exception as e_rec:
                    logger.warning(f"⚠️ [RECONCILE] Falha na reconciliação final de estatísticas do #{trigger_id}: {e_rec}")

                from services.engine import log_node_execution
                client_name = get_setting("CLIENT_NAME", "ZAPVOICE", client_id=t.client_id)
                log_node_execution(db_final, t, node_id='DELIVERY', status='completed', details=f'{client_name}: Envio finalizado para {t.total_sent} contatos.')

                pdata = dict(t.processed_data or {})
                pdata["finished_at"] = datetime.utcnow().isoformat()
                t.processed_data = pdata
                t.status = "completed"
                db_final.commit()

                await rabbitmq.publish_event("bulk_progress", build_progress_payload(trigger_id, c_id, t, total, {"status": "completed", "processed_data": pdata}))
        finally:
            db_final.close()

    except Exception as e_fatal_bulk:
        logger.error(f"❌ [BULK_FATAL_ERROR] Exceção não tratada no disparo #{trigger_id}: {e_fatal_bulk}")
        db_recovery = SessionLocal()
        try:
            t_rec = db_recovery.query(models.ScheduledTrigger).get(trigger_id)
            if t_rec and getattr(t_rec, 'status', None) == 'processing':
                rec_sent_val = getattr(t_rec, 'total_sent', 0)
                rec_sent_int = int(rec_sent_val) if isinstance(rec_sent_val, (int, float)) else 0
                t_rec.status = 'completed' if rec_sent_int > 0 else 'failed'
                t_rec.failure_reason = f"Erro de processamento: {str(e_fatal_bulk)}"
                db_recovery.commit()
                logger.info(f"🛡️ [RECOVERY] Status do Trigger #{trigger_id} atualizado para '{t_rec.status}' após erro fatal.")

                await rabbitmq.publish_event("bulk_progress", build_progress_payload(trigger_id, c_id, t_rec, total, {
                    "status": t_rec.status,
                    "failure_reason": t_rec.failure_reason
                }))
                await rabbitmq.publish_event("trigger_updated", {
                    "trigger_id": trigger_id,
                    "status": t_rec.status,
                    "client_id": c_id
                })
        except Exception as e_rec:
            logger.error(f"❌ [RECOVERY_FAILED] Erro ao recuperar trigger em exceção fatal: {e_rec}")
        finally:
            db_recovery.close()

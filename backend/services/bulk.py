import asyncio
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

import zoneinfo
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

async def refresh_dynamic_label_contacts(init_trig, db = None) -> list:
    """
    Se o trigger estiver configurado como is_dynamic_label=True, busca a lista
    de contatos mais recente da tabela de Contatos (WebhookLead - Aba de Contatos)
    no banco de dados local para as etiquetas especificadas.
    
    Também aplica dinamicamente o filtro de exclusão:
    - Re-consulta as etiquetas configuradas em `exclusion_tags` (com modo OR ou AND).
    - Subtrai da lista de envio qualquer contato que possua a etiqueta de exclusão ou
      esteja na `exclusion_list` (números estáticos manuais/planilha).
    """
    if not getattr(init_trig, "is_dynamic_label", False):
        return None

    # 1. Coletar todas as etiquetas de envio (inclusão)
    target_labels = []
    if getattr(init_trig, "dynamic_label_name", None):
        target_labels.extend([t.strip() for t in str(init_trig.dynamic_label_name).split(",") if t.strip()])
    
    if getattr(init_trig, "chatwoot_label", None):
        if isinstance(init_trig.chatwoot_label, list):
            target_labels.extend([str(t).strip() for t in init_trig.chatwoot_label if str(t).strip()])
        elif isinstance(init_trig.chatwoot_label, str):
            target_labels.extend([t.strip() for t in init_trig.chatwoot_label.split(",") if t.strip()])

    # Deduplicar preservando a ordem
    target_labels = list(dict.fromkeys(target_labels))
    if not target_labels:
        return None

    local_db = db
    should_close = False
    if local_db is None:
        local_db = SessionLocal()
        should_close = True

    try:
        from models import WebhookLead
        from sqlalchemy import func, or_, and_

        # 2. Buscar contatos das etiquetas de destino (Inclusão)
        inclusion_filters = [
            func.concat(',', func.replace(func.coalesce(WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{label},%")
            for label in target_labels
        ]
        
        leads = local_db.query(WebhookLead).filter(
            WebhookLead.client_id == init_trig.client_id,
            or_(*inclusion_filters)
        ).all()

        raw_contacts = []
        seen_phones = set()
        for l in leads:
            if l.phone:
                phone_digits = "".join(filter(str.isdigit, str(l.phone)))
                if len(phone_digits) >= 8 and phone_digits not in seen_phones:
                    seen_phones.add(phone_digits)
                    raw_contacts.append({
                        "phone": phone_digits,
                        "name": l.name or "",
                        "email": l.email or ""
                    })

        # 3. Coletar números a serem excluídos dinamicamente
        excluded_phones = set()

        # A) Etiquetas de exclusão (exclusion_tags)
        raw_ex_tags = getattr(init_trig, "exclusion_tags", None)
        ex_tags = []
        if raw_ex_tags:
            if isinstance(raw_ex_tags, list):
                ex_tags = [str(t).strip() for t in raw_ex_tags if str(t).strip()]
            elif isinstance(raw_ex_tags, str):
                ex_tags = [t.strip() for t in raw_ex_tags.split(",") if t.strip()]

        if ex_tags:
            tag_mode = (getattr(init_trig, "exclusion_tag_mode", "OR") or "OR").upper()
            tag_conditions = [
                func.concat(',', func.replace(func.coalesce(WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                for t in ex_tags
            ]
            
            ex_query = local_db.query(WebhookLead.phone).filter(
                WebhookLead.client_id == init_trig.client_id
            )
            if tag_mode == "AND":
                ex_query = ex_query.filter(and_(*tag_conditions))
            else:
                ex_query = ex_query.filter(or_(*tag_conditions))

            for (phone_val,) in ex_query.all():
                if phone_val:
                    digits = "".join(filter(str.isdigit, str(phone_val)))
                    if digits:
                        excluded_phones.add(digits)

        # B) Lista de exclusão estática (números manuais ou via CSV)
        raw_ex_list = getattr(init_trig, "exclusion_list", None)
        if raw_ex_list and isinstance(raw_ex_list, list):
            for item in raw_ex_list:
                num = item if isinstance(item, str) else (item.get("phone") if isinstance(item, dict) else str(item))
                digits = "".join(filter(str.isdigit, str(num)))
                if digits:
                    excluded_phones.add(digits)

        # Preparar sufixos de 8 dígitos para matching resiliente de exclusão
        excluded_suffixes_8 = {p[-8:] for p in excluded_phones if len(p) >= 8}

        # 4. Filtrar a lista final subtraindo os contatos excluídos
        final_contacts = []
        excluded_count = 0
        for c in raw_contacts:
            c_phone = c["phone"]
            c_suffix_8 = c_phone[-8:] if len(c_phone) >= 8 else c_phone
            
            if c_phone in excluded_phones or c_suffix_8 in excluded_suffixes_8:
                excluded_count += 1
                continue
            final_contacts.append(c)

        logger.info(
            f"🔄 [DYNAMIC REFRESH] Trigger {init_trig.id} | Etiquetas: {target_labels} | "
            f"Brutos: {len(raw_contacts)} | Excluídos por tags ({ex_tags}) ou lista: {excluded_count} | "
            f"Total Final Qualificado: {len(final_contacts)}"
        )

        return final_contacts
    except Exception as e_local:
        logger.error(f"⚠️ Erro ao atualizar contatos dinâmicos com exclusão para o trigger {init_trig.id}: {e_local}")
        return None
    finally:
        if should_close:
            local_db.close()


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
            new_contacts = await refresh_dynamic_label_contacts(trig, db=db)
            if new_contacts is not None:
                trig.contacts_list = new_contacts
                trig.total_contacts = len(new_contacts)
                changed = True

        if changed:
            db.commit()
    except Exception as e:
        logger.error(f"⚠️ Erro ao sincronizar contatos de disparos dinâmicos em fila: {e}")

async def process_bulk_send(trigger_id: int, template_name: str, contacts: list, delay: int, concurrency: int, language: str = 'pt_BR', components: list = None, direct_message: str = None, direct_message_params: dict = None, db = None):

    logger.info(f"Starting BULK SEND {trigger_id} | Contacts: {len(contacts or [])} | Delay: {delay}s |  Concurrency: {concurrency} | Lang: {language} | DM: {bool(direct_message)}")
    
    # Initialize tracking and client
    db_init = db or SessionLocal()
    should_close_init = (db is None)
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
        updated_dynamic_contacts = await refresh_dynamic_label_contacts(init_trig, db=db_init)
        if updated_dynamic_contacts is not None:
            contacts = updated_dynamic_contacts


        # Higienização e deduplicação preventiva: mantém apenas telefones válidos e únicos
        unique_contacts = []
        seen_phones_initial = set()
        duplicates_removed = 0
        invalid_removed = 0
        for c in (contacts or []):
            p_raw = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or c.get('whatsapp') or c.get('contact_phone') or c.get('number') or '')
            p_norm = normalize_phone(p_raw)
            if not p_norm or len(p_norm) < 8:
                invalid_removed += 1
                continue
            if p_norm in seen_phones_initial:
                duplicates_removed += 1
                continue
            seen_phones_initial.add(p_norm)
            unique_contacts.append(c)

        if duplicates_removed > 0 or invalid_removed > 0:
            logger.info(
                f"🧹 [BULK CLEANUP] Trigger #{trigger_id} | Original: {len(contacts or [])} | "
                f"Duplicados removidos: {duplicates_removed} | Inválidos: {invalid_removed} | "
                f"Qualificados únicos: {len(unique_contacts)}"
            )

        contacts = unique_contacts

        if not contacts:
            init_trig.status = "completed"
            init_trig.total_sent = 0
            init_trig.total_failed = 0
            db_init.commit()
            return

        # Checagem de Prazo Limite (se max_dispatch_time já passou no momento do início)
        now_start = datetime.now(timezone.utc)
        if getattr(init_trig, "max_dispatch_time", None):
            mdt = init_trig.max_dispatch_time
            if mdt.tzinfo is None:
                mdt = mdt.replace(tzinfo=timezone.utc)
            if now_start > mdt:
                abort_msg = f"Prazo limite de envio já expirado ({mdt.astimezone(BRAZIL_TZ).strftime('%d/%m/%Y %H:%M')}). Disparo abortado."
                logger.warning(f"🛑 [BULK TIMEOUT] Trigger #{trigger_id} já iniciado após o prazo limite ({mdt.isoformat()}). Abortado.")
                for c in contacts:
                    p_num = normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or ''))
                    if p_num:
                        db_init.add(models.MessageStatus(
                            trigger_id=trigger_id, phone_number=p_num, status='failed',
                            failure_reason=abort_msg, content=f"[Disparo Expirado] {template_name or 'Mensagem Direta'}"
                        ))
                from services.engine import log_node_execution
                log_node_execution(db_init, init_trig, node_id=init_trig.current_node_id or 'DELIVERY', status='failed', details=abort_msg)
                init_trig.status = "aborted"
                init_trig.failure_reason = abort_msg
                init_trig.total_failed = len(contacts)
                init_trig.total_contacts = len(contacts)
                init_trig.pending_contacts = []
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
    blocked_set = set()
    sent_phones_set = set()
    db_check_init = SessionLocal()
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
                    
        # Carregar contatos da lista de exclusão do disparo (Filtro de Exclusão seguro)
        exclusion_list = trig_exclusion_list
        if exclusion_list:
            for excl in exclusion_list:
                p_norm = normalize_phone(excl)
                if p_norm:
                    blocked_set.add(p_norm)
                    if len(p_norm) >= 8:
                        blocked_set.add(p_norm[-8:])

        # Warm-up do cache de telefones já enviados para este trigger (em memória RAM)
        sent_phones_set = await get_sent_phones_set(db_check_init, trigger_id)
    except Exception as e_prefetch_block:
        logger.error(f"⚠️ [BULK] Erro ao carregar contatos bloqueados/descanso/exclusao: {e_prefetch_block}")
    finally:
        db_check_init.close()

    # Pre-warm Media ID da Meta para mídias no header do template (Otimização 1)
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

                # Atualizar heartbeat a cada iteração de forma leve
                pdata = dict(current_trig.processed_data or {})
                pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                current_trig.processed_data = pdata
                db_batch.commit()

                while current_trig and current_trig.status == 'paused':
                    # Atualizar heartbeat enquanto pausado
                    pdata = dict(current_trig.processed_data or {})
                    pdata["last_heartbeat"] = datetime.utcnow().isoformat()
                    current_trig.processed_data = pdata
                    db_batch.commit()
                    await asyncio.sleep(5)
                    db_batch.refresh(current_trig)
                    if not current_trig or current_trig.status == 'cancelled':
                        return

                # Checagem de prazo limite e fallback 24h a cada lote
                now_check = datetime.now(timezone.utc)
                deadline = current_trig.max_dispatch_time
                if not deadline:
                    started_at_str = (current_trig.processed_data or {}).get("started_at")
                    if started_at_str:
                        try:
                            started_dt = datetime.fromisoformat(started_at_str)
                            if started_dt.tzinfo is None:
                                started_dt = started_dt.replace(tzinfo=timezone.utc)
                            deadline = started_dt + timedelta(hours=24)
                        except Exception:
                            deadline = None

                if deadline and deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)

                if deadline and now_check > deadline:
                    remaining_contacts = contacts[i:]
                    formatted_deadline = deadline.astimezone(BRAZIL_TZ).strftime('%d/%m/%Y %H:%M')
                    abort_reason = f"Prazo limite de envio atingido ({formatted_deadline}). Disparo abortado para contatos restantes."
                    logger.warning(f"🛑 [BULK TIMEOUT] Trigger #{trigger_id} ultrapassou o prazo limite ({formatted_deadline}). Abortando {len(remaining_contacts)} contatos.")
                    new_abort_fails = 0
                    for rem_c in remaining_contacts:
                        rem_p_raw = rem_c if isinstance(rem_c, str) else (rem_c.get('phone') or rem_c.get('telefone') or rem_c.get('whatsapp') or '')
                        rem_p = normalize_phone(rem_p_raw)
                        if rem_p and rem_p not in sent_phones_set:
                            db_batch.add(models.MessageStatus(
                                trigger_id=trigger_id, phone_number=rem_p, status='failed',
                                failure_reason=abort_reason, content=f"[Disparo Abortado] {template_name or 'Mensagem Direta'}"
                            ))
                            new_abort_fails += 1
                            sent_phones_set.add(rem_p)

                    from services.engine import log_node_execution
                    log_node_execution(db_batch, current_trig, node_id=current_trig.current_node_id or 'DELIVERY', status='failed', details=abort_reason)
                    current_trig.status = 'aborted'
                    current_trig.failure_reason = abort_reason
                    current_trig.total_failed = (current_trig.total_failed or 0) + new_abort_fails
                    current_trig.pending_contacts = []
                    db_batch.commit()
                    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "aborted", "client_id": c_id})
                    return

                batch = contacts[i:i + concurrency]
                batch_phones_norm = [normalize_phone(c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')) for c in batch]

                # Interaction data pre-fetch para o batch na mesma sessão unificada
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
                        if v_idx == 1 and not val:
                            val = name
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

                # Persist results em lote com agregação atômica
                sent_message_ids = []
                batch_sent = 0
                batch_failed = 0
                batch_blocked = 0
                batch_skipped = 0
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
                            db_batch.add(fail_msg)
                            batch_failed += 1

                            if "132015" in reason or "paused due to low quality" in reason:
                                abort_disparo = True
                                abort_reason = "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade."

                # Atualização agregada única por lote
                update_trigger_stats(db_batch, trigger_id, sent=batch_sent, failed=batch_failed, blocked=batch_blocked, skipped=batch_skipped, commit=False)

                if abort_disparo:
                    current_trig.status = 'aborted'
                    current_trig.failure_reason = abort_reason
                    logger.error(f"🛑 [ABORT] Disparo {trigger_id} abortado. Template pausado por baixa qualidade.")

                # Cancelamento gracioso
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

                # Commit atômico do lote
                db_batch.commit()

                if is_simulate_messaging:
                    for mid in sent_message_ids:
                        all_sim_tasks.append(asyncio.create_task(simulate_lifecycle(mid, trigger_id, c_id)))

                # Emissão de Progresso via WebSocket
                db_batch.refresh(current_trig)
                await rabbitmq.publish_event("bulk_progress", {
                    "trigger_id": trigger_id,
                    "client_id": c_id,
                    "status": current_trig.status,
                    "sent": current_trig.total_sent or 0,
                    "total_sent": current_trig.total_sent or 0,
                    "failed": current_trig.total_failed or 0,
                    "total_failed": current_trig.total_failed or 0,
                    "delivered": current_trig.total_delivered or 0,
                    "total_delivered": current_trig.total_delivered or 0,
                    "read": current_trig.total_read or 0,
                    "total_read": current_trig.total_read or 0,
                    "interactions": current_trig.total_interactions or 0,
                    "total_interactions": current_trig.total_interactions or 0,
                    "blocked": current_trig.total_blocked or 0,
                    "total_blocked": current_trig.total_blocked or 0,
                    "skipped": current_trig.total_skipped or 0,
                    "total_skipped": current_trig.total_skipped or 0,
                    "queue_count": max(0, (current_trig.total_sent or 0) - (current_trig.total_delivered or 0)),
                    "cost": float(current_trig.total_cost) if current_trig.total_cost else 0.0,
                    "total_cost": float(current_trig.total_cost) if current_trig.total_cost else 0.0,
                    "total_paid_templates": current_trig.total_paid_templates or 0,
                    "total": len(contacts),
                    "total_contacts": len(contacts)
                })

                if abort_disparo:
                    return

            finally:
                db_batch.close()

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
                
                await rabbitmq.publish_event("bulk_progress", {
                    "trigger_id": trigger_id,
                    "client_id": c_id,
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
                    "skipped": t.total_skipped or 0,
                    "total_skipped": t.total_skipped or 0,
                    "queue_count": t.queue_count if getattr(t, 'queue_count', None) is not None else 0,
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
                
                await rabbitmq.publish_event("bulk_progress", {
                    "trigger_id": trigger_id,
                    "status": t_rec.status,
                    "failure_reason": t_rec.failure_reason,
                    "sent": t_rec.total_sent or 0,
                    "total_sent": t_rec.total_sent or 0,
                    "failed": t_rec.total_failed or 0,
                    "total_failed": t_rec.total_failed or 0,
                    "delivered": t_rec.total_delivered or 0,
                    "total_delivered": t_rec.total_delivered or 0,
                    "read": t_rec.total_read or 0,
                    "total_read": t_rec.total_read or 0,
                    "interactions": t_rec.total_interactions or 0,
                    "total_interactions": t_rec.total_interactions or 0,
                    "blocked": t_rec.total_blocked or 0,
                    "total_blocked": t_rec.total_blocked or 0,
                    "total": total,
                    "total_contacts": total
                })
                await rabbitmq.publish_event("trigger_updated", {
                    "trigger_id": trigger_id,
                    "status": t_rec.status,
                    "client_id": c_id
                })
        except Exception as e_rec:
            logger.error(f"❌ [RECOVERY_FAILED] Erro ao recuperar trigger em exceção fatal: {e_rec}")
        finally:
            db_recovery.close()

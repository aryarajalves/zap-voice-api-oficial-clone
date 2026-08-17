import json
import re
from datetime import datetime, timezone
import models
from sqlalchemy import or_, func
from core.logger import setup_logger
from core.recurrent_logic import calculate_next_run
from chatwoot_client import ChatwootClient
from config_loader import get_settings

logger = setup_logger(__name__)


def resolve_lead_variables(val_raw: str, lead: models.WebhookLead) -> str:
    """Substitui tags {name}, {phone}, {email}, {event_datetime}, {google_calendar_link}."""
    if not val_raw:
        return ""
    name = lead.name or "Cliente"
    phone = lead.phone or ""
    email = lead.email or ""
    event_dt_str = lead.event_datetime.strftime("%d/%m/%Y %H:%M") if lead.event_datetime else ""
    calendar_link = lead.google_calendar_link or ""
    
    val = val_raw
    val = val.replace("{name}", name)
    val = val.replace("{phone}", phone)
    val = val.replace("{email}", email)
    val = val.replace("{event_datetime}", event_dt_str)
    val = val.replace("{google_calendar_link}", calendar_link)
    return val


async def process_calendar_reminders(db, now):
    """
    Verifica contatos com agendamentos futuros e dispara o template configurado no cliente
    quando faltar o tempo especificado (APPOINTMENTS_REMINDER_MINUTES).
    """
    try:
        clients = db.query(models.Client).all()
        for cl in clients:
            settings = get_settings(client_id=cl.id)
            enabled = settings.get("APPOINTMENTS_ENABLED")
            if not enabled or str(enabled).lower() not in ("true", "yes", "1"):
                continue

            template_name = settings.get("APPOINTMENTS_REMINDER_TEMPLATE")
            if not template_name:
                continue

            try:
                minutes = int(settings.get("APPOINTMENTS_REMINDER_MINUTES", "30"))
            except ValueError:
                minutes = 30

            # Carregar configurações adicionais de parâmetros e botões
            params_str = settings.get("APPOINTMENTS_REMINDER_PARAMS", "{}")
            buttons_str = settings.get("APPOINTMENTS_REMINDER_BUTTONS", "{}")
            
            try:
                reminder_params = json.loads(params_str) if params_str else {}
            except Exception:
                reminder_params = {}
                
            try:
                reminder_buttons = json.loads(buttons_str) if buttons_str else {}
            except Exception:
                reminder_buttons = {}

            # Buscar formato do cabeçalho do template no cache
            tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.name == template_name,
                models.WhatsAppTemplateCache.client_id == cl.id
            ).first()
            
            header_format = None
            if tpl_cache and tpl_cache.components:
                h_comp = next((c for c in tpl_cache.components if c.get("type") == "HEADER"), None)
                if h_comp:
                    header_format = h_comp.get("format")

            # Encontrar contatos deste cliente com event_datetime configurado e lembrete ainda não enviado
            if cl.project_id:
                leads_query = db.query(models.WebhookLead).filter(
                    models.WebhookLead.project_id == cl.project_id
                )
            else:
                leads_query = db.query(models.WebhookLead).filter(
                    models.WebhookLead.client_id == cl.id
                )

            leads_to_remind = leads_query.filter(
                models.WebhookLead.event_datetime.isnot(None),
                models.WebhookLead.google_calendar_reminder_sent == False,
                models.WebhookLead.event_datetime >= now
            ).all()

            for lead in leads_to_remind:
                time_diff = lead.event_datetime - now
                diff_minutes = time_diff.total_seconds() / 60.0
                
                if diff_minutes <= minutes:
                    logger.info(f"⏰ [SCHEDULER AGENDAMENTOS] Disparando lembrete para {lead.name} ({lead.phone}). Faltam {diff_minutes:.1f} minutos.")
                    try:
                        # Compilar components do template
                        components = []
                        
                        # 1. Cabeçalho de mídia (IMAGE, VIDEO, DOCUMENT)
                        if header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
                            media_url = reminder_params.get("HEADER_0")
                            if media_url:
                                media_type = header_format.lower()
                                components.append({
                                    "type": "header",
                                    "parameters": [
                                        {
                                            "type": media_type,
                                            media_type: {
                                                "link": media_url
                                            }
                                        }
                                    ]
                                })
                        
                        # Detectar variáveis exigidas no cabeçalho e corpo via Regex
                        header_vars_needed = 0
                        body_vars_needed = 0
                        if tpl_cache and tpl_cache.components:
                            for c in tpl_cache.components:
                                comp_type = c.get("type", "").upper()
                                comp_text = c.get("text", "")
                                if comp_type == "HEADER" and c.get("format") == "TEXT" and comp_text:
                                    matches = re.findall(r"\{\{(\d+)\}\}", comp_text)
                                    if matches:
                                        header_vars_needed = max(int(m) for m in matches)
                                elif comp_type == "BODY" and comp_text:
                                    matches = re.findall(r"\{\{(\d+)\}\}", comp_text)
                                    if matches:
                                        body_vars_needed = max(int(m) for m in matches)

                        # 2. Variáveis do Cabeçalho (TEXT com variáveis)
                        header_params = []
                        h_idx = 1
                        while h_idx <= header_vars_needed or f"HEADER_{h_idx}" in reminder_params:
                            val_raw = reminder_params.get(f"HEADER_{h_idx}")
                            if not val_raw:
                                val_raw = "{name}" if h_idx == 1 else ""
                            val_resolved = resolve_lead_variables(val_raw, lead)
                            header_params.append({
                                "type": "text",
                                "text": val_resolved
                            })
                            h_idx += 1
                        
                        if header_params and header_format not in ["IMAGE", "VIDEO", "DOCUMENT"]:
                            components.append({
                                "type": "header",
                                "parameters": header_params
                            })
                            
                        # 3. Variáveis do Corpo
                        body_params = []
                        b_idx = 1
                        while b_idx <= body_vars_needed or f"BODY_{b_idx}" in reminder_params:
                            val_raw = reminder_params.get(f"BODY_{b_idx}")
                            if not val_raw:
                                val_raw = "{name}" if b_idx == 1 else ""
                            val_resolved = resolve_lead_variables(val_raw, lead)
                            body_params.append({
                                "type": "text",
                                "text": val_resolved
                            })
                            b_idx += 1
                            
                        if body_params:
                            components.append({
                                "type": "body",
                                "parameters": body_params
                            })

                        client = ChatwootClient(client_id=cl.id)
                        result = await client.send_template(
                            contact_phone=lead.phone,
                            template_name=template_name,
                            template_language="pt_BR",
                            template_components=components
                        )
                        
                        if result and not (isinstance(result, dict) and result.get("error")):
                            raw_id = result["messages"][0].get("id") if isinstance(result, dict) and result.get("messages") else None
                            wamid = raw_id.replace("wamid.", "") if raw_id else None
                            
                            if wamid:
                                new_ms = models.MessageStatus(
                                    message_id=wamid,
                                    phone_number=lead.phone,
                                    status='sent',
                                    message_type='TEMPLATE',
                                    content=f"[Lembrete de Agendamento: {template_name}]",
                                    var1=str(lead.client_id)
                                )
                                db.add(new_ms)
                                
                            lead.google_calendar_reminder_sent = True
                            db.commit()
                            logger.info(f"✅ [SCHEDULER AGENDAMENTOS] Lembrete enviado com sucesso para {lead.phone}.")
                        else:
                            err_msg = result.get("detail") if isinstance(result, dict) else (result.get("error") if isinstance(result, dict) else "Erro desconhecido")
                            logger.error(f"❌ [SCHEDULER AGENDAMENTOS] Falha no disparo de template para {lead.phone}: {err_msg}")
                            new_ms = models.MessageStatus(
                                message_id=f"err_{lead.id}_{int(datetime.utcnow().timestamp())}",
                                phone_number=lead.phone,
                                status='failed',
                                message_type='TEMPLATE',
                                content=f"[Lembrete de Agendamento: {template_name}]",
                                failure_reason=str(err_msg)
                            )
                            db.add(new_ms)
                            lead.google_calendar_reminder_sent = True
                            db.commit()
                    except Exception as ex:
                        logger.error(f"❌ [SCHEDULER AGENDAMENTOS] Erro ao disparar lembrete para {lead.phone}: {ex}")
                        new_ms = models.MessageStatus(
                            message_id=f"err_exc_{lead.id}_{int(datetime.utcnow().timestamp())}",
                            phone_number=lead.phone,
                            status='failed',
                            message_type='TEMPLATE',
                            content=f"[Lembrete de Agendamento: {template_name}]",
                            failure_reason=str(ex)
                        )
                        db.add(new_ms)
                        lead.google_calendar_reminder_sent = True
                        db.commit()
    except Exception as e:
        logger.error(f"❌ [SCHEDULER AGENDAMENTOS] Erro na rotina de processamento: {e}")


async def process_recurring_triggers(db, now_utc):
    """Processa disparos com recorrência ativa cujo horário chegou."""
    active_recurring = db.query(models.RecurringTrigger).filter(
        models.RecurringTrigger.is_active == True,
        models.RecurringTrigger.next_run_at <= now_utc
    ).with_for_update(skip_locked=True).all()
    
    for rt in active_recurring:
        logger.info(f"🔄 Executando Recurring Trigger {rt.id} (Freq: {rt.frequency})...")
        
        # Calcular atraso de execução
        scheduled_time_utc = rt.next_run_at
        delay_minutes = 0.0
        if scheduled_time_utc:
            t1 = now_utc.replace(tzinfo=None) if now_utc.tzinfo else now_utc
            t2 = scheduled_time_utc.replace(tzinfo=None) if scheduled_time_utc.tzinfo else scheduled_time_utc
            delay_minutes = (t1 - t2).total_seconds() / 60.0
        
        is_aborted = delay_minutes > 30.0
        
        # Determine contacts
        exclusions = set(rt.exclusion_list or [])
        final_contacts = []
        if rt.contacts_list:
            final_contacts = [c for c in rt.contacts_list if c.get('phone') not in exclusions]
            
        if rt.tag:
            logger.info(f"🔍 Buscando contatos da etiqueta '{rt.tag}' na Aba de Contatos (WebhookLead) para a recorrência {rt.id}...")
            tag_contacts = []
            try:
                tags_list = [t.strip() for t in rt.tag.split(",") if t.strip()]
                if tags_list:
                    leads = db.query(models.WebhookLead).filter(
                        models.WebhookLead.client_id == rt.client_id,
                        or_(*(
                            func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                            for t in tags_list
                        ))
                    ).all()
                    tag_contacts = [{"phone": "".join(filter(str.isdigit, str(l.phone))), "name": l.name or ""} for l in leads if l.phone]
                    logger.info(f"📦 Aba de Contatos retornou {len(tag_contacts)} contatos com as tags '{tags_list}'")
            except Exception as e_local:
                logger.warning(f"⚠️ [RECURRING SCHEDULER] Erro ao consultar banco local para etiqueta '{rt.tag}': {e_local}")

            if not tag_contacts:
                try:
                    chatwoot = ChatwootClient(client_id=rt.client_id)
                    cw_contacts = await chatwoot.get_contacts_by_label(rt.tag)
                    if cw_contacts and isinstance(cw_contacts, list):
                        for c in cw_contacts:
                            phone_raw = c.get("phone_number") or c.get("phone") or ""
                            phone_digits = "".join(filter(str.isdigit, phone_raw))
                            if len(phone_digits) >= 8:
                                tag_contacts.append({"phone": phone_digits, "name": c.get("name") or ""})
                        logger.info(f"📦 Chatwoot retornou {len(tag_contacts)} contatos com a etiqueta '{rt.tag}'")
                except Exception as e_cw:
                    logger.warning(f"⚠️ [RECURRING SCHEDULER] Fallback Chatwoot para etiqueta '{rt.tag}': {e_cw}")

                except Exception as e:
                    logger.error(f"❌ Erro ao buscar tag '{rt.tag}' no banco local: {e}")
            
            phones_in_list = {c.get('phone') for c in final_contacts}
            for tc in tag_contacts:
                if tc['phone'] not in phones_in_list and tc['phone'] not in exclusions:
                    final_contacts.append(tc)

        if is_aborted:
            failure_reason = f"Disparo abortado: Limite de atraso (30 minutos) excedido. O disparo deveria ter ocorrido às {scheduled_time_utc.strftime('%H:%M:%S')} UTC, mas o scheduler executou às {now_utc.strftime('%H:%M:%S')} UTC ({int(delay_minutes)} minutos de atraso)."
            logger.warning(f"❌ Recurring Trigger {rt.id} abortado devido a atraso excessivo ({delay_minutes:.1f} minutos de atraso).")
            
            new_st = models.ScheduledTrigger(
                client_id=rt.client_id,
                funnel_id=rt.funnel_id,
                template_name=rt.template_name,
                template_language=rt.template_language,
                template_components=rt.template_components,
                contacts_list=final_contacts,
                delay_seconds=rt.delay_seconds,
                concurrency_limit=rt.concurrency_limit,
                private_message=rt.private_message,
                private_message_delay=rt.private_message_delay,
                private_message_concurrency=rt.private_message_concurrency,
                direct_message=rt.direct_message,
                direct_message_params=rt.direct_message_params,
                status='aborted',
                is_bulk=True,
                is_recurring=True,
                recurring_trigger_id=rt.id,
                button_actions=rt.button_actions,
                scheduled_time=scheduled_time_utc,
                failure_reason=failure_reason
            )
            db.add(new_st)
        elif not final_contacts:
            logger.warning(f"⚠️ Recurring Trigger {rt.id} não tem contatos. Pulando criação de ScheduledTrigger.")
        else:
            new_st = models.ScheduledTrigger(
                client_id=rt.client_id,
                funnel_id=rt.funnel_id,
                template_name=rt.template_name,
                template_language=rt.template_language,
                template_components=rt.template_components,
                contacts_list=final_contacts,
                delay_seconds=rt.delay_seconds,
                concurrency_limit=rt.concurrency_limit,
                private_message=rt.private_message,
                private_message_delay=rt.private_message_delay,
                private_message_concurrency=rt.private_message_concurrency,
                direct_message=rt.direct_message,
                direct_message_params=rt.direct_message_params,
                status='queued',
                is_bulk=True,
                is_recurring=True,
                recurring_trigger_id=rt.id,
                button_actions=rt.button_actions,
                scheduled_time=now_utc
            )
            db.add(new_st)
            logger.info(f"✅ Recurring Trigger {rt.id} enfileirado com sucesso.")
        
        # Update Recurring Trigger next run
        rt.last_run_at = now_utc
        rt.next_run_at = calculate_next_run(
            base_date=now_utc, 
            frequency=rt.frequency, 
            days_of_week=rt.days_of_week, 
            day_of_month=rt.day_of_month, 
            scheduled_time_str=rt.scheduled_time
        )
        db.commit()

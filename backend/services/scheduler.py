
import asyncio
import os
import models
from sqlalchemy import and_, or_
from database import SessionLocal
from datetime import datetime, timezone, timedelta
from rabbitmq_client import rabbitmq
from core.logger import setup_logger
from core.recurrent_logic import calculate_next_run
from chatwoot_client import ChatwootClient
from config_loader import get_settings

logger = setup_logger(__name__)

_last_cleanup_log: str | None = None
_last_cleanup_history: str | None = None
_last_cleanup_stale: str | None = None
_last_bulk_crash_check: str | None = None  # controle por minuto
_last_closed_window_cleanup: str | None = None

async def run_log_file_cleanup():
    """Remove linhas antigas do zapvoice_debug.log com mais de LOG_RETENTION_DAYS dias."""
    global _last_cleanup_log
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _last_cleanup_log == today:
        return

    retention_days = int(os.getenv("LOG_RETENTION_DAYS", "0"))
    if retention_days <= 0:
        _last_cleanup_log = today
        return

    def _sync_cleanup():
        log_path = "logs/zapvoice_debug.log"
        if not os.path.exists(log_path):
            return
        
        logger.info(f"🔍 [LOG CLEANUP] Iniciando limpeza do arquivo de log (retenção: {retention_days} dias)...")
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        
        try:
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            kept = [l for l in lines if (len(l) >= 10 and (l[:10] >= cutoff_str or l[3:5] == cutoff_str[5:7])) or len(l) < 10]
            removed = len(lines) - len(kept)

            if removed > 0:
                with open(log_path, "w", encoding="utf-8") as f:
                    f.writelines(kept)
                logger.info(f"🧹 [LOG CLEANUP] {removed} linha(s) removidas do log (>{retention_days} dias).")
        except Exception as e:
            logger.error(f"❌ [LOG CLEANUP] Erro na limpeza síncrona: {e}")

    try:
        await asyncio.to_thread(_sync_cleanup)
    except Exception as e:
        logger.error(f"❌ [LOG CLEANUP] Erro ao disparar thread de limpeza: {e}")
    finally:
        _last_cleanup_log = today

async def run_history_cleanup():
    """Remove registros de WebhookHistory mais antigos que HISTORY_RETENTION_DAYS dias."""
    global _last_cleanup_history
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _last_cleanup_history == today:
        return

    retention_days = int(os.getenv("HISTORY_RETENTION_DAYS", "0"))
    if retention_days <= 0:
        _last_cleanup_history = today
        return

    logger.info(f"🔍 [HISTORY CLEANUP] Iniciando limpeza do histórico de webhooks (retenção: {retention_days} dias)...")
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    db = SessionLocal()
    try:
        deleted = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.created_at < cutoff
        ).delete(synchronize_session=False)
        db.commit()
        if deleted:
            logger.info(f"🧹 [HISTORY CLEANUP] {deleted} registro(s) removidos do histórico.")
        else:
            logger.info(f"✅ [HISTORY CLEANUP] Nenhum registro antigo encontrado no histórico.")
    except Exception as e:
        logger.error(f"❌ [HISTORY CLEANUP] Erro na limpeza de histórico: {e}")
        db.rollback()
    finally:
        db.close()
        _last_cleanup_history = today

async def run_bulk_crash_detection(db_session=None):
    """
    Detecta disparos em massa cujo worker morreu (last_heartbeat > 10 min atras).
    Cria MessageStatus 'failed' para cada contato pendente e marca o trigger como 'failed'.
    Roda a cada minuto (controle por _last_bulk_crash_check).
    """
    global _last_bulk_crash_check
    now_utc = datetime.now(timezone.utc)
    minute_key = now_utc.strftime("%Y-%m-%d %H:%M")
    if _last_bulk_crash_check == minute_key:
        return

    db = db_session if db_session is not None else SessionLocal()
    try:
        # Triggers em 'cancelling' há mais de 30 segundos sem worker ativo = forçar cancelled
        cutoff_cancelling = now_utc - timedelta(seconds=30)
        stuck_cancelling = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.is_bulk == True,
            models.ScheduledTrigger.status == 'cancelling',
            models.ScheduledTrigger.updated_at < cutoff_cancelling,
        ).all()
        for tr in stuck_cancelling:
            logger.warning(f"🛑 [CRASH-REAPER] Trigger #{tr.id} preso em 'cancelling' por mais de 2min. Forçando 'cancelled'.")
            tr.status = 'cancelled'
            from services.engine import log_node_execution
            log_node_execution(db, tr, node_id=tr.current_node_id or 'DELIVERY',
                               status='cancelled', details='Cancelamento forçado pelo reaper: trigger preso em cancelling sem heartbeat.')
        if stuck_cancelling:
            db.commit()
            for tr in stuck_cancelling:
                from rabbitmq_client import rabbitmq as _rmq
                await _rmq.publish_event("trigger_updated", {"trigger_id": tr.id, "status": "cancelled", "client_id": tr.client_id})

        # Busca todos os disparos bulk em 'processing' — filtramos heartbeat em Python
        # pois last_heartbeat fica dentro do JSON processed_data
        cutoff_processing = now_utc - timedelta(minutes=1)  # TODO: voltar para 15min em produção
        candidates = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.is_bulk == True,
            models.ScheduledTrigger.status == 'processing',
            models.ScheduledTrigger.updated_at < cutoff_processing,
        ).all()

        HEARTBEAT_TIMEOUT = 1 * 60  # TODO: voltar para 10 minutos em produção (10 * 60)
        FAILURE_REASON = (
            "Servidor reiniciado durante o disparo. "
            "Este contato nao foi processado pois o sistema caiu enquanto o disparo estava em andamento."
        )
        crashed = []
        for tr in candidates:
            pdata = tr.processed_data or {}
            hb_str = pdata.get("last_heartbeat")
            if not hb_str:
                # sem heartbeat + processing por 15 min = crash
                crashed.append(tr)
                continue
            try:
                hb = datetime.fromisoformat(hb_str)
                if hb.tzinfo is not None:
                    hb = hb.astimezone(timezone.utc).replace(tzinfo=None)
                diff = (now_utc.replace(tzinfo=None) - hb).total_seconds()
                if diff >= HEARTBEAT_TIMEOUT:
                    crashed.append(tr)
            except Exception:
                crashed.append(tr)

        if not crashed:
            return  # finally ainda roda e atualiza _last_bulk_crash_check

        from services.engine import log_node_execution
        from services.utils.phone_utils import normalize_phone

        for tr in crashed:
            logger.warning(
                f"💀 [CRASH-REAPER] Bulk trigger #{tr.id} sem heartbeat por >10min. "
                f"Pendentes: {len(tr.pending_contacts or [])} contatos."
            )

            # Quais phones ainda nao foram enviados
            pending = list(tr.pending_contacts or [])

            # Pegar phones ja com MessageStatus para nao duplicar
            from sqlalchemy import func
            existing_phones = set(
                p for (p,) in db.query(models.MessageStatus.phone_number)
                .filter(models.MessageStatus.trigger_id == tr.id)
                .all()
            )

            new_failures = 0
            import uuid as _uuid
            for phone_raw in pending:
                phone = normalize_phone(phone_raw) or phone_raw
                # Normaliza para comparar com sufixo
                match = any(
                    phone == ep or (len(phone) >= 8 and phone[-10:] in ep)
                    for ep in existing_phones
                )
                if match:
                    continue
                msg = models.MessageStatus(
                    trigger_id=tr.id,
                    message_id=f"crash_{tr.id}_{phone}_{_uuid.uuid4().hex[:8]}",
                    phone_number=phone,
                    contact_name=phone,
                    status="failed",
                    failure_reason=FAILURE_REASON,
                    message_type=tr.template_name and "TEMPLATE" or "FREE_MESSAGE",
                )
                db.add(msg)
                new_failures += 1

            # Atualizar contadores e status do trigger
            tr.total_failed = (tr.total_failed or 0) + new_failures
            tr.status = "failed"
            tr.failure_reason = (
                f"Queda do servidor durante o disparo. "
                f"{new_failures} contato(s) nao processado(s) registrado(s) como falha."
            )
            tr.pending_contacts = []

            log_node_execution(
                db, tr,
                node_id=tr.current_node_id or "DELIVERY",
                status="failed",
                details=tr.failure_reason,
            )

        db.commit()
        logger.info(
            f"💀 [CRASH-REAPER] {len(crashed)} disparo(s) de crash detectado(s) e encerrado(s)."
        )

    except Exception as e:
        logger.error(f"❌ [CRASH-REAPER] Erro na deteccao de crash: {e}")
        db.rollback()
    finally:
        if db_session is None:
            db.close()
        _last_bulk_crash_check = minute_key


async def run_stale_triggers_cleanup(db_session=None):
    """Cancela Gatilhos travados ou aguardando entrega por muito tempo."""
    global _last_cleanup_stale
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d %H") # Rodar de hora em hora
    
    if _last_cleanup_stale == today and db_session is None:
        return

    db = db_session if db_session is not None else SessionLocal()
    try:
        # 1. Gatilhos pausados aguardando entrega por mais de 24 horas (Meta window)
        logger.info("🔍 [STALE CLEANUP] Verificando funis pausados há mais de 24h...")
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        stale_waiting = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.status == 'paused_waiting_delivery',
            models.ScheduledTrigger.updated_at < cutoff_24h
        ).all()
        
        for tr in stale_waiting:
            logger.warning(f"🧟 [REAPER] Cancelando Trigger {tr.id}: tempo de espera (24h) excedido.")
            tr.status = 'failed'
            tr.failure_reason = "Mensagem não entregue ao WhatsApp do cliente em 24h (aparelho offline ou impossibilitado)."
            from services.engine import log_node_execution
            log_node_execution(db, tr, node_id=tr.current_node_id, status="failed", details=tr.failure_reason)

        # 2. Gatilhos travados em 'processing' ou 'queued' por mais de 2 horas (Worker crash / RabbitMQ issue)
        # Nota: Gatilhos 'queued' com agendamento futuro (scheduled_time > now) NÃO devem ser limpos.
        logger.info("🔍 [STALE CLEANUP] Verificando disparos travados há mais de 2h...")
        cutoff_2h = datetime.now(timezone.utc) - timedelta(hours=2)
        stale_processing = db.query(models.ScheduledTrigger).filter(
            or_(
                and_(
                    models.ScheduledTrigger.status == 'queued',
                    models.ScheduledTrigger.scheduled_time < cutoff_2h
                ),
                and_(
                    models.ScheduledTrigger.status.in_(['processing', 'cancelling']),
                    models.ScheduledTrigger.updated_at < cutoff_2h
                )
            )
        ).all()

        for tr in stale_processing:
            logger.warning(f"🧟 [REAPER] Falhando Trigger {tr.id}: travado em {tr.status} por mais de 2h.")
            tr.status = 'failed'
            tr.failure_reason = f"Disparo travado: O tempo limite de processamento (2h) foi excedido. Possível queda do sistema ou erro crítico no worker durante o status {tr.status}."
            from services.engine import log_node_execution
            log_node_execution(db, tr, node_id=tr.current_node_id or 'DELIVERY', status="failed", details=tr.failure_reason)

        # 3. Mensagens individuais presas na fila da Meta (enviadas, mas sem confirmação de
        # entrega/leitura) há mais de 24 horas. Isso acontece quando a Meta aceita a mensagem
        # mas nunca confirma o status via webhook (ex: número inválido silencioso, throttling
        # da Meta, etc.). Sem esse corte, o contato fica "preso" na fila indefinidamente.
        logger.info("🔍 [STALE CLEANUP] Verificando mensagens presas na fila da Meta há mais de 24h...")
        stale_queue_messages = db.query(models.MessageStatus).filter(
            models.MessageStatus.status == 'sent',
            models.MessageStatus.delivered_counted == False,
            models.MessageStatus.read_counted == False,
            models.MessageStatus.timestamp < cutoff_24h
        ).all()

        if stale_queue_messages:
            queue_fail_reason = "Ultrapassou 24 horas ainda na fila da Meta (WhatsApp) sem confirmação de entrega — disparo abortado."
            failed_per_trigger = {}
            for ms in stale_queue_messages:
                ms.status = 'failed'
                ms.failure_reason = queue_fail_reason
                failed_per_trigger[ms.trigger_id] = failed_per_trigger.get(ms.trigger_id, 0) + 1

            if failed_per_trigger:
                triggers_to_update = db.query(models.ScheduledTrigger).filter(
                    models.ScheduledTrigger.id.in_(failed_per_trigger.keys())
                ).all()
                for tr in triggers_to_update:
                    tr.total_failed = (tr.total_failed or 0) + failed_per_trigger.get(tr.id, 0)

            logger.warning(f"🧟 [REAPER] {len(stale_queue_messages)} mensagem(ns) presas na fila da Meta há +24h marcadas como falha.")

        db.commit()
        if not stale_waiting and not stale_processing and not stale_queue_messages:
            logger.info("✅ [STALE CLEANUP] Nenhum gatilho obsoleto encontrado.")
        else:
            logger.info(f"🧹 [STALE CLEANUP] Limpeza concluída: {len(stale_waiting)} expirados, {len(stale_processing)} travados, {len(stale_queue_messages)} presos na fila da Meta.")
            
    except Exception as e:
        logger.error(f"❌ [STALE CLEANUP] Erro ao limpar gatilhos obsoletos: {e}")
        db.rollback()
    finally:
        if db_session is None:
            db.close()
        _last_cleanup_stale = today

async def process_recurring_triggers(db, now_utc):
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
            logger.info(f"🔍 Filtrando contatos da etiqueta no banco local pela tag: {rt.tag}")
            tag_contacts = []
            try:
                from sqlalchemy import or_, func
                tags_list = [t.strip() for t in rt.tag.split(",") if t.strip()]
                if tags_list:
                    leads = db.query(models.WebhookLead).filter(
                        models.WebhookLead.client_id == rt.client_id,
                        or_(*(
                            func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                            for t in tags_list
                        ))
                    ).all()
                    tag_contacts = [{"phone": l.phone, "name": l.name} for l in leads]
                    logger.info(f"📦 Banco local retornou {len(tag_contacts)} contatos com as tags '{tags_list}'")
                else:
                    logger.info(f"📦 Nenhuma tag válida encontrada em '{rt.tag}'")
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
            # Create ScheduledTrigger normal (queued)
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

async def run_closed_window_label_cleanup(db_session=None):
    """
    Remove etiquetas configuradas no WA_WINDOW_CLOSED_REMOVE_LABELS das conversas do chat interno
    cuja janela de 24h foi fechada. Roda a cada minuto.
    """
    global _last_closed_window_cleanup
    now_utc = datetime.now(timezone.utc)
    minute_key = now_utc.strftime("%Y-%m-%d %H:%M")
    
    if _last_closed_window_cleanup == minute_key and db_session is None:
        return
        
    db = db_session if db_session is not None else SessionLocal()
    try:
        # 1. Obter todas as configurações de etiquetas para remoção
        configs = db.query(models.AppConfig).filter(
            models.AppConfig.key == "WA_WINDOW_CLOSED_REMOVE_LABELS"
        ).all()
        
        if not configs:
            return
            
        safety_limit = now_utc - timedelta(hours=24)
        
        for config in configs:
            client_id = config.client_id
            val = config.value or ""
            target_labels = [l.strip() for l in val.split(",") if l.strip()]
            if not target_labels:
                continue
                
            target_labels_lower = [tl.lower() for tl in target_labels]
            
            # Buscar conversas ativas do cliente
            conversations = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == client_id,
                models.ChatConversation.status == "open"
            ).all()
            
            for convo in conversations:
                # Verificar se a janela de 24h está fechada
                last_msg_at = convo.last_contact_message_at
                is_closed = False
                if last_msg_at is None:
                    is_closed = True
                else:
                    if last_msg_at.tzinfo is None:
                        last_msg_at = last_msg_at.replace(tzinfo=timezone.utc)
                    if last_msg_at < safety_limit:
                        is_closed = True
                        
                if is_closed:
                    convo_labels = convo.labels or []
                    has_label_to_remove = False
                    new_labels = []
                    
                    for lbl in convo_labels:
                        if lbl.lower() in target_labels_lower:
                            has_label_to_remove = True
                        else:
                            new_labels.append(lbl)
                            
                    if has_label_to_remove:
                        convo.labels = new_labels
                        db.commit()
                        
                        # Notifica o frontend via WebSocket usando RabbitMQ
                        payload_ws = {
                            "conversation_id": convo.id,
                            "client_id": client_id,
                            "labels": new_labels
                        }
                        await rabbitmq.publish_event("conversation_updated", payload_ws)
                        logger.info(f"🧹 [LABEL-CLEANUP] Janela fechada para conversa {convo.id}. "
                                    f"Etiquetas removidas do chat interno: {target_labels}")
                                    
    except Exception as e:
        logger.error(f"❌ [LABEL-CLEANUP] Erro no ciclo de limpeza de etiquetas: {e}")
        db.rollback()
    finally:
        if db_session is None:
            db.close()
        _last_closed_window_cleanup = minute_key


def resolve_lead_variables(val_raw: str, lead: models.WebhookLead) -> str:
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
            
            import json
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
                        
                        # 2. Variáveis do Cabeçalho (TEXT com variáveis)
                        header_params = []
                        h_idx = 1
                        while f"HEADER_{h_idx}" in reminder_params:
                            val_raw = reminder_params[f"HEADER_{h_idx}"]
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
                        while f"BODY_{b_idx}" in reminder_params:
                            val_raw = reminder_params[f"BODY_{b_idx}"]
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
                            # Criar MessageStatus para registrar o envio do template de agendamento e armazenar as button_actions
                            raw_id = result["messages"][0].get("id") if isinstance(result, dict) and result.get("messages") else None
                            wamid = raw_id.replace("wamid.", "") if raw_id else None
                            
                            # Registra no MessageStatus
                            if wamid:
                                new_ms = models.MessageStatus(
                                    message_id=wamid,
                                    phone_number=lead.phone,
                                    status='sent',
                                    message_type='TEMPLATE',
                                    content=f"[Lembrete de Agendamento: {template_name}]",
                                    # Armazenamos button_actions no MessageStatus ou ScheduledTrigger
                                    # Para o inbound funcionar de forma transparente, criamos uma ScheduledTrigger de simulação ou salvamos as ações diretamente no ScheduledTrigger associado
                                    # Para que o whatsapp_inbound.py resolva sem trigger_ref, já implementamos a consulta dinâmica de settings.APPOINTMENTS_REMINDER_BUTTONS diretamente lá.
                                )
                                db.add(new_ms)
                                
                            lead.google_calendar_reminder_sent = True
                            db.commit()
                            logger.info(f"✅ [SCHEDULER AGENDAMENTOS] Lembrete enviado com sucesso para {lead.phone}.")
                        else:
                            err_msg = result.get("detail") if isinstance(result, dict) else (result.get("error") if isinstance(result, dict) else "Erro desconhecido")
                            logger.error(f"❌ [SCHEDULER AGENDAMENTOS] Falha no disparo de template para {lead.phone}: {err_msg}")
                            # Registrar a falha no MessageStatus
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
                        # Registrar a falha no MessageStatus
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


async def scheduler_task():
    logger.info("Scheduler task started (RabbitMQ Mode)")
    while True:
        try:
            db = SessionLocal()
            now_utc = datetime.now(timezone.utc)
            
            # --- 1. PROCESS RECURRING TRIGGERS ---
            await process_recurring_triggers(db, now_utc)

            # --- 1.2. PROCESS CALENDAR APPOINTMENTS REMINDERS ---
            await process_calendar_reminders(db, now_utc)

            # --- 2. PROCESS PENDING ONE-OFF TRIGGERS ---
            pending_triggers = db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.status == 'queued',
                models.ScheduledTrigger.scheduled_time <= now_utc
            ).with_for_update(skip_locked=True).all()
            
            for trigger in pending_triggers:
                logger.info(f"Disparando trigger agendado {trigger.id} para fila...")
                
                # Marca como processing
                trigger.status = "processing"
                db.commit()

                # Notifica Frontend via WS (através do RabbitMQ Events)
                await rabbitmq.publish_event("trigger_updated", {
                    "trigger_id": trigger.id,
                    "client_id": trigger.client_id,
                    "status": "processing"
                })
                
                # Trigger em Massa (Template ou Funil)
                if trigger.is_bulk:
                    payload = {
                        "trigger_id": trigger.id,
                        "funnel_id": trigger.funnel_id,
                        "template_name": trigger.template_name,
                        "contacts": trigger.contacts_list,
                        "delay": trigger.delay_seconds,
                        "concurrency": trigger.concurrency_limit,
                        "language": trigger.template_language or 'pt_BR',
                        "components": trigger.template_components,
                        "direct_message": trigger.direct_message,
                        "direct_message_params": trigger.direct_message_params,
                        "private_message": trigger.private_message,
                        "private_message_delay": trigger.private_message_delay,
                        "private_message_concurrency": trigger.private_message_concurrency,
                        "type": "funnel_bulk" if trigger.funnel_id else "template_bulk"
                    }
                    await rabbitmq.publish("zapvoice_bulk_sends", payload)
                
                # Trigger Individual (Apenas se tiver telefone de contato)
                elif trigger.contact_phone:
                    payload = {
                        "trigger_id": trigger.id,
                        "funnel_id": trigger.funnel_id,
                        "conversation_id": trigger.conversation_id,
                        "contact_phone": trigger.contact_phone,
                        "chatwoot_contact_id": trigger.chatwoot_contact_id,
                        "chatwoot_account_id": trigger.chatwoot_account_id,
                        "chatwoot_inbox_id": trigger.chatwoot_inbox_id
                    }
                    await rabbitmq.publish("zapvoice_funnel_executions", payload)
                
                else:
                    logger.warning(f"⚠️ [SCHEDULER] Trigger {trigger.id} ignorado no despacho por falta de destinatário válido.")
            
            db.close()
            
            # Rodar limpezas de forma protegida
            try:
                await run_bulk_crash_detection()   # a cada minuto — detecta bulk travado por queda do servidor
                await run_closed_window_label_cleanup() # a cada minuto — remove etiquetas se janela 24h estiver fechada
                await run_history_cleanup()
                await run_stale_triggers_cleanup()
                await run_log_file_cleanup()
            except Exception as clean_err:
                logger.error(f"⚠️ Erro durante ciclo de limpeza: {clean_err}")

        except Exception as e:
            logger.error(f"Scheduler loop error: {e}")

        # Aguardar 2s para o próximo ciclo
        await asyncio.sleep(2)

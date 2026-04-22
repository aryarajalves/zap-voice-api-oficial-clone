
import asyncio
import os
import models
from database import SessionLocal
from datetime import datetime, timezone, timedelta
from rabbitmq_client import rabbitmq
from core.logger import setup_logger
from core.recurrent_logic import calculate_next_run

logger = setup_logger(__name__)

_last_cleanup_date: str | None = None

async def run_log_file_cleanup():
    """Remove linhas antigas do zapvoice_debug.log com mais de LOG_RETENTION_DAYS dias."""
    global _last_cleanup_date
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _last_cleanup_date == today:
        return

    retention_days = int(os.getenv("LOG_RETENTION_DAYS", "0"))
    if retention_days <= 0:
        return

    log_path = "zapvoice_debug.log"
    if not os.path.exists(log_path):
        return

    logger.info(f"🔍 [LOG CLEANUP] Iniciando limpeza do arquivo de log (retenção: {retention_days} dias)...")
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")

    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        kept = [l for l in lines if l[:10] >= cutoff_str or len(l) < 10]
        removed = len(lines) - len(kept)

        if removed > 0:
            with open(log_path, "w", encoding="utf-8") as f:
                f.writelines(kept)
            logger.info(f"🧹 [LOG CLEANUP] {removed} linha(s) removidas do log (>{retention_days} dias). {len(kept)} linha(s) mantidas.")
        else:
            logger.info(f"✅ [LOG CLEANUP] Nenhuma linha antiga encontrada no log. Total: {len(lines)} linha(s).")
    except Exception as e:
        logger.error(f"❌ [LOG CLEANUP] Erro na limpeza do arquivo de log: {e}")

async def run_history_cleanup():
    """Remove registros de WebhookHistory mais antigos que HISTORY_RETENTION_DAYS dias."""
    global _last_cleanup_date
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _last_cleanup_date == today:
        return  # já rodou hoje

    retention_days = int(os.getenv("HISTORY_RETENTION_DAYS", "0"))
    if retention_days <= 0:
        return  # desabilitado

    logger.info(f"🔍 [HISTORY CLEANUP] Iniciando limpeza do histórico de webhooks (retenção: {retention_days} dias)...")
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    db = SessionLocal()
    try:
        deleted = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.created_at < cutoff
        ).delete(synchronize_session=False)
        db.commit()
        if deleted:
            logger.info(f"🧹 [HISTORY CLEANUP] {deleted} registro(s) removidos do histórico (>{retention_days} dias).")
        else:
            logger.info(f"✅ [HISTORY CLEANUP] Nenhum registro antigo encontrado no histórico.")
    except Exception as e:
        logger.error(f"❌ [HISTORY CLEANUP] Erro na limpeza de histórico: {e}")
        db.rollback()
    finally:
        db.close()
        _last_cleanup_date = today

async def run_stale_triggers_cleanup():
    """Cancela Gatilhos pausados aguardando entrega por mais de 24 horas."""
    logger.info("🔍 [STALE CLEANUP] Verificando funis pausados há mais de 24h...")
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    db = SessionLocal()
    try:
        stale_triggers = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.status == 'paused_waiting_delivery',
            models.ScheduledTrigger.updated_at < cutoff
        ).all()
        
        for tr in stale_triggers:
            logger.warning(f"🧟 [REAPER] Cancelando Trigger {tr.id}: tempo de espera (24h) excedido.")
            tr.status = 'failed'
            tr.failure_reason = "Mensagem não entregue ao WhatsApp do cliente em 24h (aparelho offline ou impossibilitado)."
            
            # Registrar falha no histórico para a UI
            from services.engine import log_node_execution
            log_node_execution(
                db, tr, 
                node_id=tr.current_node_id, 
                status="failed", 
                details=tr.failure_reason
            )
            
        db.commit()
    except Exception as e:
        logger.error(f"❌ [STALE CLEANUP] Erro ao limpar gatilhos obsoletos: {e}")
        db.rollback()
    finally:
        db.close()

async def scheduler_task():
    logger.info("Scheduler task started (RabbitMQ Mode)")
    while True:
        try:
            db = SessionLocal()
            now_utc = datetime.now(timezone.utc)
            
            # --- 1. PROCESS RECURRING TRIGGERS ---
            active_recurring = db.query(models.RecurringTrigger).filter(
                models.RecurringTrigger.is_active == True,
                models.RecurringTrigger.next_run_at <= now_utc
            ).with_for_update(skip_locked=True).all()
            
            for rt in active_recurring:
                logger.info(f"🔄 Executando Recurring Trigger {rt.id} (Freq: {rt.frequency})...")
                
                # Determine contacts
                final_contacts = rt.contacts_list or []
                if rt.tag:
                    logger.info(f"🔍 Re-filtrando contatos pela tag: {rt.tag}")
                    leads = db.query(models.WebhookLead).filter(
                        models.WebhookLead.client_id == rt.client_id,
                        models.WebhookLead.tags.ilike(f"%{rt.tag}%")
                    ).all()
                    
                    # Merge or use those leads
                    # Convert to standard format
                    tag_contacts = [{"phone": l.phone, "name": l.name} for l in leads]
                    if rt.contacts_list:
                        # Append if user wants to combine? No, usually it's one or the other.
                        # Rule: Tag overrides/merges with static list if both present
                        phones_in_list = {c.get('phone') for c in final_contacts}
                        for tc in tag_contacts:
                            if tc['phone'] not in phones_in_list:
                                final_contacts.append(tc)
                    else:
                        final_contacts = tag_contacts

                if not final_contacts:
                    logger.warning(f"⚠️ Recurring Trigger {rt.id} não tem contatos. Pulando criação de ScheduledTrigger.")
                else:
                    # Create ScheduledTrigger
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
                        scheduled_time=now_utc
                    )
                    db.add(new_st)
                
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
                        "private_message_concurrency": trigger.private_message_concurrency
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
            await run_history_cleanup()
            await run_stale_triggers_cleanup()
            await run_log_file_cleanup()
        except Exception as e:
            logger.error(f"Scheduler loop error: {e}")

        await asyncio.sleep(2)

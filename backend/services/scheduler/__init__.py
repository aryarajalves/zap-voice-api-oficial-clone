import asyncio
from datetime import datetime, timezone
import models
from database import SessionLocal
from rabbitmq_client import rabbitmq
from core.logger import setup_logger

# Importações dos Submódulos Modulares
from services.scheduler.cleanup_tasks import (
    run_log_file_cleanup,
    run_history_cleanup,
    run_bulk_crash_detection,
    run_stale_triggers_cleanup,
    run_closed_window_label_cleanup,
)
from services.scheduler.recurring_processor import (
    resolve_lead_variables,
    process_calendar_reminders,
    process_recurring_triggers,
)
from services.scheduler.email_processor import (
    process_scheduled_email_dispatches,
)

logger = setup_logger(__name__)

# Variáveis globais de controle de ciclo do scheduler (mantidas públicas para testes unitários)
_last_waba_payment_check: datetime | None = None
_last_cleanup_log: str | None = None
_last_cleanup_history: str | None = None
_last_cleanup_stale: str | None = None
_last_bulk_crash_check: str | None = None
_last_closed_window_cleanup: str | None = None

# Exportações públicas para manter retrocompatibilidade total com routers e testes
__all__ = [
    "run_log_file_cleanup",
    "run_history_cleanup",
    "run_bulk_crash_detection",
    "run_stale_triggers_cleanup",
    "run_closed_window_label_cleanup",
    "resolve_lead_variables",
    "process_calendar_reminders",
    "process_recurring_triggers",
    "process_scheduled_email_dispatches",
    "scheduler_task",
    "rabbitmq",
    "_last_cleanup_stale",
    "_last_cleanup_log",
    "_last_cleanup_history",
    "_last_bulk_crash_check",
    "_last_closed_window_cleanup",
]


async def scheduler_task():
    """Loop principal do Scheduler em segundo plano (RabbitMQ Mode)."""
    global _last_waba_payment_check
    logger.info("Scheduler task started (RabbitMQ Mode)")

    while True:
        try:
            db = SessionLocal()
            now_utc = datetime.now(timezone.utc)
            
            # --- 1. PROCESS RECURRING TRIGGERS ---
            await process_recurring_triggers(db, now_utc)

            # --- 1.2. PROCESS CALENDAR APPOINTMENTS REMINDERS ---
            await process_calendar_reminders(db, now_utc)

            # --- 1.3. AUDIT META WABA PAYMENT HEALTH EVERY 2 HOURS (7200s) ---
            if _last_waba_payment_check is None or (now_utc - _last_waba_payment_check).total_seconds() >= 7200:
                _last_waba_payment_check = now_utc
                try:
                    from services.waba_payment_service import WabaPaymentService
                    await WabaPaymentService.check_all_active_clients_payment(db)
                except Exception as e_waba_pay:
                    logger.error(f"❌ [WABA_PAYMENT_SCHEDULER] Erro ao executar auditoria periódica de pagamentos: {e_waba_pay}")

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
            
            # Rodar limpezas e processamentos periódicos de forma protegida
            try:
                await run_bulk_crash_detection()          # a cada minuto — detecta bulk travado por queda do servidor
                await run_closed_window_label_cleanup()   # a cada minuto — remove etiquetas se janela 24h estiver fechada
                await run_history_cleanup()
                await run_stale_triggers_cleanup()
                await run_log_file_cleanup()
                await process_scheduled_email_dispatches() # processa e-mails agendados vencidos
            except Exception as clean_err:
                logger.error(f"⚠️ Erro durante ciclo de limpeza: {clean_err}")

        except Exception as e:
            logger.error(f"Scheduler loop error: {e}")

        # Aguardar 2s para o próximo ciclo
        await asyncio.sleep(2)

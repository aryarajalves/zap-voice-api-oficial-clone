from datetime import datetime, timezone
import models
from sqlalchemy import and_, or_
from database import SessionLocal
from rabbitmq_client import rabbitmq
from core.logger import setup_logger
from services.email_service import send_single_email

logger = setup_logger(__name__)


async def process_scheduled_email_dispatches(db_session=None):
    """
    Verifica disparos de e-mail agendados cujo horário já passou e os executa.
    Roda em todo ciclo do scheduler.
    """
    db = db_session or SessionLocal()
    close_db = db_session is None
    try:
        now_utc = datetime.now(timezone.utc)
        # 1. Recuperar dispatches que ficaram em 'processing' ou 'scheduled' vencidos
        due_dispatches = db.query(models.EmailDispatch).filter(
            or_(
                and_(
                    models.EmailDispatch.status == "scheduled",
                    models.EmailDispatch.scheduled_time <= now_utc
                ),
                models.EmailDispatch.status == "processing"
            )
        ).all()

        if not due_dispatches:
            return

        for dispatch in due_dispatches:
            logger.info(f"📧 [EMAIL SCHEDULER] Processando disparo ID={dispatch.id} (Status: {dispatch.status}, Total: {dispatch.total_contacts})...")
            if dispatch.status != "processing":
                dispatch.status = "processing"
                db.commit()

            # Notifica WebSocket
            try:
                await rabbitmq.publish_event("email_dispatch_updated", {
                    "dispatch_id": dispatch.id,
                    "client_id": dispatch.client_id,
                    "status": "processing",
                    "total_sent": dispatch.total_sent or 0,
                    "total_failed": dispatch.total_failed or 0
                })
            except Exception as ws_err:
                logger.warning(f"⚠️ Erro ao publicar evento WS de e-mail: {ws_err}")

            try:
                config = db.query(models.EmailConfig).filter_by(client_id=dispatch.client_id).first()
                if not config:
                    dispatch.status = "failed"
                    dispatch.failure_reason = "Configuração de e-mail não encontrada para o cliente."
                    db.commit()
                    logger.error(f"❌ [EMAIL SCHEDULER] Disparo {dispatch.id} falhou: sem config de e-mail.")
                    await rabbitmq.publish_event("email_dispatch_updated", {
                        "dispatch_id": dispatch.id,
                        "client_id": dispatch.client_id,
                        "status": "failed",
                        "failure_reason": dispatch.failure_reason
                    })
                    continue

                template = db.query(models.EmailTemplate).filter_by(
                    id=dispatch.template_id, client_id=dispatch.client_id
                ).first()
                if not template:
                    dispatch.status = "failed"
                    dispatch.failure_reason = "Template de e-mail não encontrado."
                    db.commit()
                    logger.error(f"❌ [EMAIL SCHEDULER] Disparo {dispatch.id} falhou: template não encontrado.")
                    await rabbitmq.publish_event("email_dispatch_updated", {
                        "dispatch_id": dispatch.id,
                        "client_id": dispatch.client_id,
                        "status": "failed",
                        "failure_reason": dispatch.failure_reason
                    })
                    continue

                contacts = dispatch.contacts_list or []
                sent_count = dispatch.total_sent or 0
                fail_count = dispatch.total_failed or 0

                # Itera sobre os contatos que ainda não foram processados (status != sent/failed)
                for c in contacts:
                    if c.get("sent_status") in ("sent", "failed"):
                        continue

                    try:
                        res = await send_single_email(
                            config=config,
                            to_email=c.get("email", ""),
                            subject=template.subject,
                            body_html=template.body_html,
                            recipient_name=c
                        )
                        if res.get("success"):
                            sent_count += 1
                            c["sent_status"] = "sent"
                        else:
                            fail_count += 1
                            c["sent_status"] = "failed"
                            c["error"] = res.get("error", "Erro de envio")
                    except Exception as send_err:
                        fail_count += 1
                        c["sent_status"] = "failed"
                        c["error"] = str(send_err)
                        logger.error(f"❌ [EMAIL SCHEDULER] Erro ao enviar para {c.get('email')}: {send_err}")

                    # Persiste o progresso no banco a cada e-mail para resiliência a restarts
                    dispatch.total_sent = sent_count
                    dispatch.total_failed = fail_count
                    dispatch.contacts_list = contacts
                    db.commit()

                    # Notifica progresso no WebSocket
                    try:
                        await rabbitmq.publish_event("email_dispatch_updated", {
                            "dispatch_id": dispatch.id,
                            "client_id": dispatch.client_id,
                            "status": "processing",
                            "total_sent": sent_count,
                            "total_failed": fail_count
                        })
                    except Exception:
                        pass

                dispatch.total_sent = sent_count
                dispatch.total_failed = fail_count
                dispatch.status = (
                    "completed" if fail_count == 0
                    else ("completed_with_errors" if sent_count > 0 else "failed")
                )
                db.commit()
                logger.info(f"✅ [EMAIL SCHEDULER] Disparo {dispatch.id} concluído: {sent_count} enviados, {fail_count} falhas.")

                await rabbitmq.publish_event("email_dispatch_updated", {
                    "dispatch_id": dispatch.id,
                    "client_id": dispatch.client_id,
                    "status": dispatch.status,
                    "total_sent": sent_count,
                    "total_failed": fail_count
                })

            except Exception as dispatch_err:
                logger.error(f"❌ [EMAIL SCHEDULER] Erro ao processar disparo {dispatch.id}: {dispatch_err}")
                dispatch.status = "failed"
                dispatch.failure_reason = str(dispatch_err)
                db.commit()
                await rabbitmq.publish_event("email_dispatch_updated", {
                    "dispatch_id": dispatch.id,
                    "client_id": dispatch.client_id,
                    "status": "failed",
                    "failure_reason": str(dispatch_err)
                })
    except Exception as e:
        logger.error(f"❌ [EMAIL SCHEDULER] Erro na rotina de e-mails agendados: {e}")
    finally:
        if close_db:
            db.close()

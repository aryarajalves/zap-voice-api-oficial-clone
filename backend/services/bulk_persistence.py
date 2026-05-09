import models
from database import SessionLocal
from core.logger import setup_logger
from services.utils.phone_utils import normalize_phone

logger = setup_logger(__name__)

async def get_sent_phones_set(db, trigger_id: int) -> set:
    """Retorna um conjunto de telefones que já receberam mensagem com sucesso para este trigger."""
    sent_phones_raw = db.query(models.MessageStatus.phone_number).filter(
        models.MessageStatus.trigger_id == trigger_id,
        models.MessageStatus.status == 'sent'
    ).all()
    return {normalize_phone(p[0]) for p in sent_phones_raw if p[0]}

def update_trigger_stats(db, trigger_id: int, sent: int = 0, failed: int = 0, blocked: int = 0, total: int = None):
    """Atualiza os contadores do trigger de forma atômica."""
    updates = {}
    if sent: updates["total_sent"] = models.ScheduledTrigger.total_sent + sent
    if failed: updates["total_failed"] = models.ScheduledTrigger.total_failed + failed
    if blocked: updates["total_blocked"] = models.ScheduledTrigger.total_blocked + blocked
    if total is not None: updates["total_contacts"] = total
    
    if updates:
        db.query(models.ScheduledTrigger).filter_by(id=trigger_id).update(updates)
        db.commit()

def record_blocked_status(trigger_id: int, phone: str):
    """Registra um status de falha por bloqueio."""
    db = SessionLocal()
    try:
        existing = db.query(models.MessageStatus).filter_by(
            message_id=f"blocked_{trigger_id}_{phone}"
        ).first()
        if not existing:
            new_status = models.MessageStatus(
                trigger_id=trigger_id,
                message_id=f"blocked_{trigger_id}_{phone}",
                phone_number=phone,
                status="failed",
                failure_reason="Lista de Exclusão (Bloqueado)",
                message_type="TEMPLATE"
            )
            db.add(new_status)
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"⚠️ Error recording blocked status: {e}")
    finally:
        db.close()

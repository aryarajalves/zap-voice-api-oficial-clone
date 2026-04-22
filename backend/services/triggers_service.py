import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
import models

logger = logging.getLogger("TriggersService")

def increment_sent_stats(db: Session, trigger_id: int):
    """
    Atomic increment of total_sent count.
    """
    try:
        db.execute(
            text("UPDATE scheduled_triggers SET total_sent = COALESCE(total_sent, 0) + 1 WHERE id = :tid"),
            {"tid": trigger_id}
        )
        db.commit()
    except Exception as e:
        logger.error(f"❌ [SENT COUNT] Failed: {e}")
        db.rollback()

def increment_delivery_stats(db: Session, trigger: models.ScheduledTrigger, message_record: models.MessageStatus, cost: float = 0.0):
    """
    Atomic increment of delivery stats to prevent double counting.
    Returns True if incremented, False if already counted.
    """
    # Double check idempotency even before locking to avoid unnecessary DB pressure
    if message_record.delivered_counted:
        return False

    try:
        # Refetch with lock
        message_record = db.query(models.MessageStatus).filter(
            models.MessageStatus.id == message_record.id
        ).with_for_update().first()

        if not message_record or message_record.delivered_counted:
            return False

        # Mark as counted
        message_record.delivered_counted = True
        db.flush() # Ensure change is sent to DB
        
        # Atomic increment of the trigger counters
        # We use raw SQL for atomicity at the DB level
        paid_inc = 1 if cost > 0 else 0
        db.execute(
            text("UPDATE scheduled_triggers SET total_delivered = COALESCE(total_delivered, 0) + 1, total_paid_templates = COALESCE(total_paid_templates, 0) + :pinc, total_cost = COALESCE(total_cost, 0) + :cost WHERE id = :tid"),
            {"cost": cost, "tid": trigger.id, "pinc": paid_inc}
        )
        
        db.commit()
        logger.info(f"✅ [ATOMIC COUNT] Trigger {trigger.id} incremented (Contact: {message_record.phone_number}, Cost: {cost})")
        return True
    except Exception as e:
        logger.error(f"❌ [ATOMIC COUNT] Failed to increment: {e}")
        db.rollback()
        return False

def increment_read_stats(db: Session, trigger_id: int):
    """
    Atomic increment of total_read count.
    """
    try:
        db.execute(
            text("UPDATE scheduled_triggers SET total_read = COALESCE(total_read, 0) + 1 WHERE id = :tid"),
            {"tid": trigger_id}
        )
        db.commit()
    except Exception as e:
        logger.error(f"❌ [READ COUNT] Failed: {e}")
        db.rollback()

def increment_failed_stats(db: Session, trigger_id: int):
    """
    Atomic increment of total_failed count.
    """
    try:
        db.execute(
            text("UPDATE scheduled_triggers SET total_failed = COALESCE(total_failed, 0) + 1 WHERE id = :tid"),
            {"tid": trigger_id}
        )
        db.commit()
    except Exception as e:
        logger.error(f"❌ [FAILED COUNT] Failed: {e}")
        db.rollback()

def increment_private_note_stats(db: Session, trigger_id: int):
    """
    Atomic increment of private note stats.
    """
    try:
        db.execute(
            text("UPDATE scheduled_triggers SET total_private_notes = COALESCE(total_private_notes, 0) + 1 WHERE id = :tid"),
            {"tid": trigger_id}
        )
        db.commit()
        logger.info(f"✅ [ATOMIC NOTE COUNT] Trigger {trigger_id} incremented (Private Note)")
        return True
    except Exception as e:
        logger.error(f"❌ [ATOMIC NOTE COUNT] Failed to increment: {e}")
        db.rollback()
        return False

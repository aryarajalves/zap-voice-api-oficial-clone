import hmac
import hashlib
import json
import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from core.logger import setup_logger

logger = setup_logger(__name__)

def check_hmac_signature_logic(body: bytes, secret: str, signature_header: str) -> bool:
    """
    Valida assinatura HMAC-SHA256.
    """
    if not secret:
        return True
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not signature_header:
        return False
    received = signature_header[7:] if signature_header.startswith("sha256=") else signature_header
    if not received:
        return False
    return hmac.compare_digest(expected, received)

def recalculate_webhook_stats_logic(webhook_id: int, db: Session):
    """
    Recalcula as estatísticas (received, processed, errors) de um webhook.
    """
    try:
        webhook = db.query(models.WebhookConfig).filter(models.WebhookConfig.id == webhook_id).first()
        if not webhook:
            return

        total = db.query(models.WebhookEvent).filter(models.WebhookEvent.webhook_id == webhook_id).count()
        processed = db.query(models.WebhookEvent).filter(
            models.WebhookEvent.webhook_id == webhook_id,
            models.WebhookEvent.status == 'processed'
        ).count()
        errors = db.query(models.WebhookEvent).filter(
            models.WebhookEvent.webhook_id == webhook_id,
            models.WebhookEvent.status == 'failed'
        ).count()
        
        webhook.total_received = total
        webhook.total_processed = processed
        webhook.total_errors = errors
        db.commit()
    except Exception as e:
        logger.error(f"❌ [WEBHOOK STATS] Error: {e}")
        db.rollback()

from fastapi import APIRouter, Request, Body, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from datetime import datetime, timezone
import json
import hashlib
from core.deps import get_db
from core.security import limiter
from core.logger import setup_logger
from core.utils import get_nested
from websocket_manager import manager

logger = setup_logger(__name__)
router = APIRouter()

@router.post("/old-catch/{slug}")
async def catch_webhook_deprecated(slug: str, request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Endpoint genérico para receber Webhooks de sistemas externos (Hotmart, Eduzz, etc.)
    """
    webhook = db.query(models.WebhookConfig).filter(models.WebhookConfig.slug == slug).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    payload_str = json.dumps(payload, sort_keys=True)
    external_id = payload.get("id") or payload.get("event_id") or hashlib.md5(payload_str.encode()).hexdigest()
    
    existing = db.query(models.WebhookEvent).filter(
        models.WebhookEvent.webhook_id == webhook.id,
        models.WebhookEvent.external_id == str(external_id)
    ).first()
    
    if existing:
        return {"status": "ignored", "message": "Duplicate event"}

    event = models.WebhookEvent(
        webhook_id=webhook.id,
        external_id=str(external_id),
        payload=payload,
        headers=dict(request.headers),
        status="processing"
    )
    
    try:
        db.add(event)
        db.commit()
        db.refresh(event)
        
        await manager.broadcast({
            "event": "webhook_caught",
            "data": {"id": event.id, "webhook_id": webhook.id, "slug": slug, "payload": payload, "headers": dict(request.headers)}
        })
        
        webhook.total_received += 1
        webhook.last_payload = payload
        
        mapping = webhook.field_mapping or {}
        phone_path = mapping.get("phone_field")
        name_path = mapping.get("name_field")
        
        phone = get_nested(payload, phone_path)
        name = get_nested(payload, name_path)
        
        if not phone:
            event.status = "failed"
            event.error_message = "Phone field not found in payload"
            webhook.total_errors += 1
            db.commit()
            return {"status": "error", "message": "Phone field not found"}

        clean_phone = ''.join(filter(str.isdigit, str(phone)))
        status_path = mapping.get("status_field")
        raw_status = get_nested(payload, status_path) if status_path else (payload.get("status") or payload.get("Status"))
        status_str = str(raw_status).lower() if raw_status else ""
        
        is_approved = any(x in status_str for x in ["aprovada", "approved", "complete", "paid", "pago"])
        
        from datetime import timedelta
        delay_sec = 0
        if is_approved and webhook.approved_delay_amount:
            amount = webhook.approved_delay_amount
            unit = (webhook.approved_delay_unit or "seconds").lower()
            if "minute" in unit: delay_sec = amount * 60
            elif "hour" in unit: delay_sec = amount * 3600
            else: delay_sec = amount
        elif webhook.delay_amount:
            amount = webhook.delay_amount
            unit = (webhook.delay_unit or "seconds").lower()
            if "minute" in unit: delay_sec = amount * 60
            elif "hour" in unit: delay_sec = amount * 3600
            else: delay_sec = amount

        scheduled_time = datetime.now(timezone.utc)
        if delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=delay_sec)

        trigger = models.ScheduledTrigger(
            client_id=webhook.client_id,
            funnel_id=webhook.funnel_id,
            contact_phone=clean_phone,
            contact_name=str(name) if name else None,
            status='queued',
            scheduled_time=scheduled_time
        )
        db.add(trigger)
        event.status = "processed"
        event.processed_at = datetime.now(timezone.utc)
        webhook.total_processed += 1
        db.commit()
        return {"status": "success", "trigger_id": trigger.id, "scheduled_at": scheduled_time.isoformat()}

    except Exception as e:
        db.rollback()
        event.status = "failed"
        event.error_message = str(e)
        webhook.total_errors += 1
        db.commit()
        logger.error(f"Error processing webhook {slug}: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/ping")
async def ping_webhook():
    return {"status": "ok", "version": "1.2.0-robust-match", "timestamp": datetime.now(timezone.utc)}

from fastapi import APIRouter, Request, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from datetime import datetime, timezone, timedelta
import os
import json
from core.deps import get_db
from core.security import limiter
from core.logger import setup_logger
from services.webhook_processing_service import check_hmac_signature_logic
from rabbitmq_client import rabbitmq
from utils import normalize_phone

logger = setup_logger(__name__)
router = APIRouter()

@router.post("/chatwoot")
@router.post("/chatwoot_events")
@router.post("/webhooks/chatwoot_events")
@limiter.limit("5000/minute")
async def chatwoot_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    chatwoot_secret = os.getenv("CHATWOOT_WEBHOOK_SECRET", "")
    if chatwoot_secret:
        body = await request.body()
        signature = request.headers.get("X-Chatwoot-Signature", "")
        if not check_hmac_signature_logic(body, chatwoot_secret, signature):
            logger.warning("❌ Chatwoot webhook: assinatura HMAC inválida")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_type = payload.get("event")
    log_msg = f"📥 [CHATWOOT] {datetime.now(timezone.utc)} | Event: {event_type}"
    logger.info(log_msg)
    
    with open("webhooks_incoming.log", "a", encoding="utf-8") as f:
        f.write(f"{log_msg} | Payload: {json.dumps(payload)}\n")

    try:
        from models import AppConfig
        debug_json = json.dumps({"timestamp": str(datetime.now(timezone.utc)), "payload": payload})
        existing = db.query(AppConfig).filter(AppConfig.key == "DEBUG_CHATWOOT_LAST").first()
        if existing: existing.value = debug_json
        else: db.add(AppConfig(client_id=1, key="DEBUG_CHATWOOT_LAST", value=debug_json))
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao salvar debug chatwoot: {e}")

    if event_type == "message_created":
        msg_type = payload.get("message_type")
        if msg_type in ["incoming", "outgoing", 0, 1]:
            try:
                account_id = payload.get("account", {}).get("id")
                inbox_id = payload.get("inbox", {}).get("id")
                conversation = payload.get("conversation", {})
                sender = payload.get("sender", {})
                phone_number = sender.get("phone_number") or conversation.get("meta", {}).get("sender", {}).get("phone_number") or conversation.get("contact_inbox", {}).get("source_id")
                
                if phone_number:
                    clean_phone = "".join(filter(str.isdigit, str(phone_number)))
                    client_id = 1 
                    config = db.query(models.AppConfig).filter(models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', models.AppConfig.value == str(account_id)).first()
                    if config: client_id = config.client_id
                    
                    if msg_type in ["incoming", 0]:
                        now_utc = datetime.now(timezone.utc)
                        window = db.query(models.ContactWindow).filter(models.ContactWindow.phone == clean_phone, models.ContactWindow.client_id == client_id, models.ContactWindow.chatwoot_inbox_id == inbox_id).first()
                        if window:
                            window.last_interaction_at = now_utc
                            window.chatwoot_conversation_id = conversation.get("id")
                        else:
                            db.add(models.ContactWindow(client_id=client_id, phone=clean_phone, chatwoot_inbox_id=inbox_id, last_interaction_at=now_utc, chatwoot_conversation_id=conversation.get("id")))
                        db.commit()

                        # --- [REMOVED] GATILHO DUPLICADO ---
                        # Funis de WhatsApp são processados diretamente via Meta (whatsapp.py)
                        # para evitar disparos duplos e garantir metadados completos (nome do perfil).
                        pass
            except Exception as e:
                logger.error(f"❌ Erro no processamento de webhook Chatwoot: {e}")
                db.rollback()

    elif event_type == "message_updated":
        msg_id = payload.get("id")
        status = payload.get("status")
        if msg_id and status:
            msg_id_str = str(msg_id)
            message_record = db.query(models.MessageStatus).filter(models.MessageStatus.message_id == msg_id_str).with_for_update().first()
            if message_record:
                if message_record.status != status:
                    message_record.status = status
                    message_record.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    return {"status": "updated", "msg_id": msg_id, "new_status": status}
    
    return {"status": "ok"}

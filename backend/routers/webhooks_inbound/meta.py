from typing import Any
from fastapi import APIRouter, Request, Body, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import models
from datetime import datetime, timezone
import os
import json
from core.deps import get_db
from core.security import limiter
from core.logger import setup_logger
from services.webhook_processing_service import check_hmac_signature_logic
from rabbitmq_client import rabbitmq

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/meta", summary="Meta Verification Challenge")
async def meta_verification(request: Request, db: Session = Depends(get_db)):
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token:
        configured_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "zapvoice_oficial")
        if token == configured_token:
            logger.info("✅ Meta Webhook Challenge Verified!")
            return Response(content=challenge, media_type="text/plain")
        else:
            logger.warning(f"❌ Meta Verification Failed. Received: {token}")
            raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    raise HTTPException(status_code=403, detail="Invalid verification request")

@router.post("/meta", summary="Meta Event Ingestion")
async def meta_event_ingestion(request: Request, payload: Any = Body(...), db: Session = Depends(get_db)):
    # Converte payload para dict se vier como bytes
    if isinstance(payload, bytes):
        try:
            payload = json.loads(payload.decode('utf-8'))
        except Exception as e:
            logger.error(f"❌ Erro ao decodificar payload bytes: {e}")
            return Response(content="Invalid JSON", status_code=400)

    logger.info(f"📥 [META_WEBHOOK] Evento recebido da Meta")
    
    meta_secret = os.getenv("META_APP_SECRET", "")
    if meta_secret:
        body = await request.body()
        signature = request.headers.get("X-Hub-Signature-256", "")
        if not check_hmac_signature_logic(body, meta_secret, signature):
            logger.error("❌ Assinatura Meta inválida!")
            return Response(content="Invalid signature", status_code=403)

    # Log para arquivo para depuração histórica
    try:
        with open("webhooks_incoming.log", "a", encoding="utf-8") as f:
            f.write(f"📥 [META] {datetime.now(timezone.utc)} | Payload: {json.dumps(payload)}\n")
    except Exception as e:
        logger.error(f"❌ Erro ao gravar log de webhook: {e}")

    # Envia para o Worker via RabbitMQ
    try:
        await rabbitmq.publish("whatsapp_events", payload)
        logger.info("📤 [META] Evento publicado no RabbitMQ: whatsapp_events")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Falha ao publicar no RabbitMQ: {e}")
        return {"status": "error_queued_locally"}

@router.post("/whatsapp/status")
@limiter.limit("5000/minute")
async def whatsapp_status_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """ Proxy to RabbitMQ """
    try:
        await rabbitmq.publish("whatsapp_events", payload)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Falha ao publicar status no RabbitMQ: {e}")
        return {"status": "error"}

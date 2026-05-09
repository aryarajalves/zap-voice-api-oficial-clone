from typing import Any
from fastapi import APIRouter, Request, Body, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import models
from datetime import datetime, timezone, timedelta
import os
import json
import hashlib
from core.deps import get_db
from core.security import limiter
from core.logger import setup_logger
from services.webhook_processing_service import check_hmac_signature_logic
from rabbitmq_client import rabbitmq

logger = setup_logger(__name__)
router = APIRouter()

# Trava Global de Memória para evitar Race Conditions de milissegundos nos webhooks da Meta
GLOBAL_META_LOCKS = {}

@router.api_route("/meta", methods=["GET", "POST"], summary="Meta Webhook (Verification & Events)")
@router.api_route("/meta/", methods=["GET", "POST"], include_in_schema=False)
async def meta_webhook_handler(request: Request, db: Session = Depends(get_db)):
    if request.method == "GET":
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

    # Caso seja POST
    body = await request.body()
    
    # 0. Front Shield (Atomic Lock)
    # Evita que a Meta envie o mesmo payload 2x em menos de 5s (comum em retentativas de rede)
    import hashlib
    payload_hash = hashlib.sha256(body).hexdigest()
    lock_key = f"meta_{payload_hash}"
    now = datetime.now(timezone.utc)
    
    if lock_key in GLOBAL_META_LOCKS:
        last_time = GLOBAL_META_LOCKS[lock_key]
        if now - last_time < timedelta(seconds=5):
            logger.warning(f"🚫 [META_LOCK] Payload duplicado detectado. Ignorando publicação.")
            return {"status": "ignored", "reason": "duplicate_meta_payload"}
    
    GLOBAL_META_LOCKS[lock_key] = now

    try:
        payload = json.loads(body.decode('utf-8'))
    except Exception:
        body = await request.body()
        try:
            payload = json.loads(body.decode('utf-8'))
        except Exception as e:
            logger.error(f"❌ Erro ao decodificar payload Meta: {e}")
            return Response(content="Invalid JSON", status_code=400)
    if isinstance(payload, bytes):
        try:
            payload = json.loads(payload.decode('utf-8'))
        except Exception as e:
            logger.error(f"❌ Erro ao decodificar payload bytes: {e}")
            return Response(content="Invalid JSON", status_code=400)

    # Log ultra-visível para o console
    try:
        # Tenta extrair informações básicas sem quebrar se a estrutura mudar
        entry = payload.get("entry", [{}])[0]
        change = entry.get("changes", [{}])[0]
        value = change.get("value", {})
        
        statuses = value.get("statuses", [])
        messages = value.get("messages", [])
        
        if statuses:
            st = statuses[0]
            logger.info(f"🔔 [META_INBOUND] STATUS: {st.get('status')} | MSG_ID: {st.get('id')} | PARA: {st.get('recipient_id')}")
        if messages:
            msg = messages[0]
            logger.info(f"🖱️ [META_INBOUND] INTERAÇÃO: {msg.get('type')} | DE: {msg.get('from')} | CORPO: {msg.get('text', {}).get('body') or msg.get('button', {}).get('text')}")
        
        if not statuses and not messages:
             logger.info(f"📥 [META_WEBHOOK] Evento recebido (Estrutura diferente)")
    except Exception as e:
        logger.info(f"📥 [META_WEBHOOK] Evento recebido (Erro ao resumir: {e})")
    
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

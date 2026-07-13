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
@limiter.exempt
async def meta_webhook_handler(request: Request, db: Session = Depends(get_db), slug: str = None):
    # Identificar client_id associado ao slug, se houver
    client_id = 1
    if slug:
        cfg = db.query(models.AppConfig).filter(
            models.AppConfig.key == "WA_WEBHOOK_SLUG",
            models.AppConfig.value == slug
        ).first()
        if not cfg:
            logger.warning(f"❌ Slug de webhook não encontrado: {slug}")
            raise HTTPException(status_code=404, detail="Webhook config slug not found")
        client_id = cfg.client_id
        logger.info(f"🎯 [META] Rota customizada detectada. Slug: {slug} | Client ID: {client_id}")

    if request.method == "GET":
        params = request.query_params
        mode = params.get("hub.mode")
        token = params.get("hub.verify_token")
        challenge = params.get("hub.challenge")

        if mode == "subscribe" and token:
            # Buscar token específico do cliente nas configurações, com fallback para o ENV
            configured_token = None
            if client_id:
                token_cfg = db.query(models.AppConfig).filter(
                    models.AppConfig.client_id == client_id,
                    models.AppConfig.key == "WHATSAPP_VERIFY_TOKEN"
                ).first()
                if token_cfg:
                    configured_token = token_cfg.value
            
            if not configured_token:
                configured_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "zapvoice_oficial")
            
            if token == configured_token:
                logger.info(f"✅ Meta Webhook Challenge Verified for Client {client_id}!")
                return Response(content=challenge, media_type="text/plain")
            else:
                logger.warning(f"❌ Meta Verification Failed for Client {client_id}. Received: {token}")
                raise HTTPException(status_code=403, detail="Verification token mismatch")
        raise HTTPException(status_code=403, detail="Invalid verification request")

    # Caso seja POST
    body = await request.body()
    
    # 0. Front Shield (Atomic Lock)
    # Evita que a Meta envie o mesmo payload 2x in less than 5s
    import hashlib
    payload_hash = hashlib.sha256(body).hexdigest()
    lock_key = f"meta_{slug or 'default'}_{payload_hash}"
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

    # Injetar client_id associado no payload para consumo do Worker
    # Se não foi resolvido pelo slug, tenta resolver dinamicamente pelo phone_number_id
    if not slug:
        try:
            entry = payload.get("entry", [{}])[0]
            change = entry.get("changes", [{}])[0]
            value = change.get("value", {})
            metadata = value.get("metadata", {})
            phone_number_id = metadata.get("phone_number_id")
            
            if phone_number_id:
                configs = db.query(models.AppConfig).join(
                    models.Client, models.Client.id == models.AppConfig.client_id
                ).filter(
                    models.AppConfig.key == "WA_PHONE_NUMBER_ID",
                    models.AppConfig.value == str(phone_number_id),
                    models.Client.is_active == True
                ).all()
                
                if configs:
                    # Fallback inicial
                    client_id = configs[0].client_id
                    
                    # Se houver duplicidade do mesmo número em mais de um cliente (ambiente de teste/configurações duplicadas)
                    if len(configs) > 1:
                        # Identificar número do contato remetente/destinatário
                        from_phone = None
                        messages = value.get("messages", [])
                        statuses = value.get("statuses", [])
                        if messages:
                            from_phone = messages[0].get("from")
                        elif statuses:
                            from_phone = statuses[0].get("recipient_id")
                        
                        if from_phone:
                            clean_phone = "".join(filter(str.isdigit, str(from_phone)))
                            suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone
                            
                            client_ids = [cfg.client_id for cfg in configs]
                            # Tentar encontrar qual cliente possui uma conversa local para este telefone
                            convo = db.query(models.ChatConversation).filter(
                                models.ChatConversation.client_id.in_(client_ids),
                                models.ChatConversation.phone.like(f"%{suffix}")
                            ).order_by(models.ChatConversation.last_message_at.desc()).first()
                            
                            if convo:
                                client_id = convo.client_id
                                logger.info(f"🎯 [META] Colisão de multi-inquilinos resolvida por conversa ativa com {from_phone}: Client ID {client_id}")
                            else:
                                logger.info(f"🎯 [META] Colisão detectada mas nenhuma conversa ativa encontrada para {from_phone}. Usando primeiro cliente cadastrado: Client ID {client_id}")
                        else:
                            logger.info(f"🎯 [META] Colisão detectada e sem telefone para diferenciar. Usando Client ID {client_id}")
                    else:
                        logger.info(f"🎯 [META] Client ID resolvido de forma única pelo phone_number_id {phone_number_id}: {client_id}")
        except Exception as e_resolve:
            logger.error(f"⚠️ [META] Erro ao tentar resolver client_id pelo phone_number_id: {e_resolve}")

    if client_id:
        payload["client_id"] = client_id

    # Log ultra-visível para o console
    try:
        entry = payload.get("entry", [{}])[0]
        change = entry.get("changes", [{}])[0]
        value = change.get("value", {})
        
        statuses = value.get("statuses", [])
        messages = value.get("messages", [])
        
        if statuses:
            st = statuses[0]
            logger.info(f"🔔 [META_INBOUND] STATUS: {st.get('status')} | MSG_ID: {st.get('id')} | PARA: {st.get('recipient_id')} | Client: {client_id}")
        if messages:
            msg = messages[0]
            logger.info(f"🖱️ [META_INBOUND] INTERAÇÃO: {msg.get('type')} | DE: {msg.get('from')} | CORPO: {msg.get('text', {}).get('body') or msg.get('button', {}).get('text')} | Client: {client_id}")
        
        if not statuses and not messages:
             logger.info(f"📥 [META_WEBHOOK] Evento recebido (Estrutura diferente) | Client: {client_id}")
    except Exception as e:
        logger.info(f"📥 [META_WEBHOOK] Evento recebido (Erro ao resumir: {e}) | Client: {client_id}")
    
    meta_secret = os.getenv("META_APP_SECRET", "")
    if meta_secret:
        body = await request.body()
        signature = request.headers.get("X-Hub-Signature-256", "")
        if not check_hmac_signature_logic(body, meta_secret, signature):
            logger.error("❌ Assinatura Meta inválida!")
            return Response(content="Invalid signature", status_code=403)

    # Log para arquivo para depuração histórica
    try:
        os.makedirs("logs", exist_ok=True)
        with open("logs/webhooks_incoming.log", "a", encoding="utf-8") as f:
            f.write(f"📥 [META] {datetime.now(timezone.utc)} | Client: {client_id} | Payload: {json.dumps(payload)}\n")
    except Exception as e:
        logger.error(f"❌ Erro ao gravar log de webhook: {e}")

    # Envia para o Worker via RabbitMQ
    try:
        await rabbitmq.publish("whatsapp_events", payload)
        logger.info(f"📤 [META] Evento publicado no RabbitMQ: whatsapp_events (Client ID: {client_id})")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Falha ao publicar no RabbitMQ: {e}")
        return {"status": "error_queued_locally"}

@router.post("/whatsapp/status")
@limiter.exempt
async def whatsapp_status_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """ Proxy to RabbitMQ """
    try:
        await rabbitmq.publish("whatsapp_events", payload)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Falha ao publicar status no RabbitMQ: {e}")
        return {"status": "error"}

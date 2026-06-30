import httpx
import threading
from sqlalchemy import event
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
from database import SessionLocal
from config_loader import get_setting
from core.logger import setup_logger

logger = setup_logger("ChatWebhookService")

# Thread pool ou thread isolada para evitar travar as transações síncronas do DB com requisições HTTP
def dispatch_webhook_in_thread(url: str, payload: dict):
    def run():
        try:
            logger.info(f"📤 [CHAT-WEBHOOK] Despachando evento para: {url}")
            with httpx.Client(timeout=5.0) as client:
                response = client.post(url, json=payload)
                logger.info(f"📥 [CHAT-WEBHOOK] Resposta do Webhook: Status {response.status_code}")
        except Exception as e:
            logger.error(f"❌ [CHAT-WEBHOOK] Falha ao despachar webhook para {url}: {e}")

    # Dispara a execução em segundo plano de forma isolada
    t = threading.Thread(target=run, daemon=True)
    t.start()

# Registrar o listener após a inserção de ChatMessage
@event.listens_for(models.ChatMessage, "after_insert")
def after_message_insert(mapper, connection, target):
    """
    Listener do SQLAlchemy acionado sempre que um ChatMessage é inserido no banco.
    """
    # Usar uma sessão temporária independente para buscar os relacionamentos e evitar erros de sessão ligada à transação original
    db: Session = SessionLocal()
    try:
        # 1. Buscar a conversa associada para pegar o client_id, telefone e nome
        convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.id == target.conversation_id
        ).first()

        if not convo or not convo.client_id:
            return

        client_id = convo.client_id

        # 2. Buscar a URL do webhook configurada para este cliente
        webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=client_id)
        if not webhook_url or not webhook_url.strip():
            return

        # 3. Buscar o BSUD do Lead se disponível
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == client_id,
            models.WebhookLead.phone == convo.phone
        ).first()
        bsud = lead.bsud if lead else None

        # 4. Montar o Payload rico
        payload = {
            "event": "message.created",
            "client_id": client_id,
            "message": {
                "id": target.id,
                "conversation_id": target.conversation_id,
                "sender_type": target.sender_type,  # 'user', 'agent' ou 'system'
                "message_type": target.message_type,  # 'text', 'audio', etc.
                "content": target.content,
                "media_url": target.media_url,
                "timestamp": target.timestamp.isoformat() if target.timestamp else datetime.now(timezone.utc).isoformat(),
                "is_private": getattr(target, 'is_private', False),
                "metadata": target.meta_data or {}
            },
            "contact": {
                "phone": convo.phone,
                "name": convo.contact_name or convo.phone,
                "bsud": bsud,
                "labels": convo.labels or []
            }
        }

        # 5. Despachar em Background sem travar a thread da requisição original
        dispatch_webhook_in_thread(webhook_url, payload)

    except Exception as err:
        logger.error(f"❌ [CHAT-WEBHOOK-LISTENER] Erro ao preparar dados do webhook: {err}")
    finally:
        db.close()

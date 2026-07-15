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
def dispatch_webhook_in_thread(url: str, payload: dict, message_id: int):
    def run():
        import time
        db: Session = SessionLocal()
        try:
            logger.info(f"📤 [CHAT-WEBHOOK] Despachando evento para: {url}")
            status = "failed"
            error_msg = None
            try:
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(url, json=payload)
                    logger.info(f"📥 [CHAT-WEBHOOK] Resposta do Webhook: Status {response.status_code}")
                    if 200 <= response.status_code < 300:
                        status = "success"
                    elif response.status_code in [403, 404, 410]:
                        status = "cancelled"
                        error_msg = f"Webhook cancelado/desativado na outra plataforma (HTTP {response.status_code})"
                    else:
                        error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
            except Exception as http_err:
                error_msg = str(http_err)
                err_lower = error_msg.lower()
                if "connection refused" in err_lower or "connect call failed" in err_lower or "connection closed" in err_lower:
                    status = "cancelled"
                    error_msg = f"Conexão recusada ou serviço desativado/cancelado na outra plataforma: {error_msg}"
                else:
                    status = "failed"
                logger.error(f"❌ [CHAT-WEBHOOK] Falha ao despachar webhook para {url}: {http_err}")

            # Esperar o commit da transação principal se necessário (máximo 5 tentativas)
            msg = None
            for _ in range(5):
                msg = db.query(models.ChatMessage).filter(models.ChatMessage.id == message_id).first()
                if msg:
                    break
                time.sleep(0.5)
                db.rollback() # Limpa o cache da query/transação do SQLite/Postgres para ler o novo estado

            if msg:
                msg.agentflow_webhook_status = status
                msg.agentflow_webhook_error = error_msg
                db.commit()
                logger.info(f"💾 [CHAT-WEBHOOK] Log salvo no banco para a mensagem {message_id}: status={status}")
            else:
                logger.warning(f"⚠️ [CHAT-WEBHOOK] Mensagem {message_id} não encontrada no banco após timeout (transação principal não commitada?).")
        except Exception as db_err:
            logger.error(f"❌ [CHAT-WEBHOOK] Erro ao salvar status de log no banco: {db_err}")
        finally:
            db.close()

    # Dispara a execução em segundo plano de forma isolada
    t = threading.Thread(target=run, daemon=True)
    t.start()

# Registrar o listener após a inserção de ChatMessage
@event.listens_for(models.ChatMessage, "after_insert")
def after_message_insert(mapper, connection, target):
    """
    Listener do SQLAlchemy acionado sempre que um ChatMessage é inserido no banco.
    """
    db = None
    created_local_db = False
    try:
        # Para obter o lead_id, bsud e a conversa, precisamos de uma sessão
        from sqlalchemy.orm import Session
        db = Session.object_session(target)
        if not db:
            db = SessionLocal()
            created_local_db = True

        # Buscar a conversa associada para pegar o client_id, telefone e nome
        convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.id == target.conversation_id
        ).first()
        if not convo or not convo.client_id:
            return

        # Clique de botão com activate_agent=False → não despachar para o AgentFlow
        if target.meta_data and target.meta_data.get("skip_agentflow"):
            logger.info(f"⏭️ [CHAT-WEBHOOK] Mensagem {target.id} marcada com skip_agentflow — AgentFlow não notificado.")
            connection.execute(
                models.ChatMessage.__table__.update()
                .where(models.ChatMessage.id == target.id)
                .values(agentflow_webhook_status="skipped")
            )
            return

        client_id = convo.client_id

        # 2. Buscar a URL do webhook configurada para este cliente
        webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=client_id)
        if not webhook_url or not webhook_url.strip():
            # Gravar como não configurado
            connection.execute(
                models.ChatMessage.__table__.update()
                .where(models.ChatMessage.id == target.id)
                .values(agentflow_webhook_status="not_configured")
            )
            return

        # 3. Buscar o BSUD do Lead se disponível
        lead = db.query(models.WebhookLead).filter(
            models.WebhookLead.client_id == client_id,
            models.WebhookLead.phone == convo.phone
        ).first()
        bsud = lead.bsud if lead else None

        # Calcular metadados da janela de 24h
        window_24h_data = None
        if convo.last_contact_message_at:
            from datetime import timedelta
            last_contact_msg_at = convo.last_contact_message_at
            if last_contact_msg_at.tzinfo is None:
                last_contact_msg_at = last_contact_msg_at.replace(tzinfo=timezone.utc)

            expiry = last_contact_msg_at + timedelta(hours=24)
            now = datetime.now(timezone.utc)
            remaining = int((expiry - now).total_seconds())
            if remaining < 0:
                remaining = 0

            window_24h_data = {
                "last_contact_message_at": last_contact_msg_at.isoformat(),
                "expiry": expiry.isoformat(),
                "remaining_seconds": remaining
            }

        # 4. Montar o Payload rico
        payload = {
            "event": "message.created",
            "client_id": client_id,
            "window_24h": window_24h_data,
            "message": {
                "id": target.id,
                "conversation_id": target.conversation_id,
                "sender_type": target.sender_type,  # 'user', 'agent' ou 'system'
                "message_type": target.message_type,  # 'text', 'audio', etc.
                "content": target.content,
                "media_url": target.media_url,
                "timestamp": target.timestamp.isoformat() if target.timestamp else datetime.now(timezone.utc).isoformat(),
                "is_private": getattr(target, 'is_private', False),
                "metadata": {
                    **(target.meta_data or {}),
                    "window_24h": window_24h_data
                }
            },
            "contact": {
                "phone": convo.phone,
                "name": convo.contact_name or convo.phone,
                "bsud": bsud,
                "labels": convo.labels or [],
                "window_24h": window_24h_data
            }
        }

        # 5. Despachar em Background sem travar a thread da requisição original
        dispatch_webhook_in_thread(webhook_url, payload, target.id)

    except Exception as err:
        logger.error(f"❌ [CHAT-WEBHOOK-LISTENER] Erro ao preparar dados do webhook: {err}")
    finally:
        if created_local_db and db:
            db.close()

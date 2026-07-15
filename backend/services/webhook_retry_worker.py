"""
webhook_retry_worker.py
Worker de background que reenvia webhooks que falharam (status=failed) para o AgentFlow.

Logica:
- Roda a cada 2 minutos em uma thread daemon
- Busca mensagens com status "failed" das ultimas 2 horas e retry_count < 3
- Reenvia respeitando o backoff exponencial: 2min, 8min, 32min
- Em caso de sucesso: status -> success
- Em caso de falha: retry_count += 1, agenda retry_at com backoff
- Apos 3 falhas: status -> retry_exhausted
"""
import time
import httpx
import threading
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

import models
from database import SessionLocal
from config_loader import get_setting
from core.logger import setup_logger

logger = setup_logger("WebhookRetryWorker")

# Intervalo entre cada ciclo do worker (segundos)
WORKER_INTERVAL_SECONDS = 120

# Maximo de tentativas de reenvio por mensagem
MAX_RETRIES = 3

# Janela de busca: mensagens que falharam nas ultimas N horas
SEARCH_WINDOW_HOURS = 2

# Backoff exponencial em minutos por tentativa (indice = retry_count ja executado)
# retry_count=0 -> aguarda 2min, retry_count=1 -> 8min, retry_count=2 -> 32min
BACKOFF_MINUTES = [2, 8, 32]


def _compute_next_retry_at(retry_count: int) -> datetime:
    """Calcula o proximo timestamp de retry baseado no backoff exponencial."""
    delay = BACKOFF_MINUTES[min(retry_count, len(BACKOFF_MINUTES) - 1)]
    return datetime.now(timezone.utc) + timedelta(minutes=delay)


def _rebuild_payload(msg: models.ChatMessage, db: Session) -> dict | None:
    """Reconstroi o payload do webhook a partir dos dados salvos no banco."""
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == msg.conversation_id
    ).first()
    if not convo or not convo.client_id:
        return None

    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == convo.client_id,
        models.WebhookLead.phone == convo.phone
    ).first()
    bsud = lead.bsud if lead else None

    window_24h_data = None
    if convo.last_contact_message_at:
        last_contact_msg_at = convo.last_contact_message_at
        if last_contact_msg_at.tzinfo is None:
            last_contact_msg_at = last_contact_msg_at.replace(tzinfo=timezone.utc)
        expiry = last_contact_msg_at + timedelta(hours=24)
        now = datetime.now(timezone.utc)
        remaining = max(0, int((expiry - now).total_seconds()))
        window_24h_data = {
            "last_contact_message_at": last_contact_msg_at.isoformat(),
            "expiry": expiry.isoformat(),
            "remaining_seconds": remaining
        }

    return {
        "event": "message.created",
        "client_id": convo.client_id,
        "window_24h": window_24h_data,
        "retry": True,  # Marcador para diferenciar retentativas no AgentFlow
        "message": {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_type": msg.sender_type,
            "message_type": msg.message_type,
            "content": msg.content,
            "media_url": msg.media_url,
            "timestamp": msg.timestamp.isoformat() if msg.timestamp else datetime.now(timezone.utc).isoformat(),
            "is_private": getattr(msg, "is_private", False),
            "metadata": {
                **(msg.meta_data or {}),
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


def _process_retry_batch():
    """Processa um ciclo de retentativas: busca, reenvia e atualiza o status."""
    db: Session = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=SEARCH_WINDOW_HOURS)
        now = datetime.now(timezone.utc)

        # Buscar mensagens falhas dentro da janela e que ja estao no horario de retry
        candidates = db.query(models.ChatMessage).filter(
            models.ChatMessage.agentflow_webhook_status == "failed",
            models.ChatMessage.timestamp >= cutoff,
            models.ChatMessage.agentflow_retry_count < MAX_RETRIES,
            # So reenviar se o retry_at ja passou (ou nao foi definido ainda)
            (
                (models.ChatMessage.agentflow_retry_at == None) |
                (models.ChatMessage.agentflow_retry_at <= now)
            )
        ).all()

        if not candidates:
            return

        logger.info(f"[RETRY] {len(candidates)} mensagem(ns) elegivel(is) para reenvio.")

        for msg in candidates:
            retry_count = msg.agentflow_retry_count or 0
            attempt_num = retry_count + 1

            # Buscar URL do cliente
            convo = db.query(models.ChatConversation).filter(
                models.ChatConversation.id == msg.conversation_id
            ).first()
            if not convo or not convo.client_id:
                logger.warning(f"[RETRY] Mensagem {msg.id}: conversa ou client_id nao encontrado. Ignorando.")
                continue

            webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=convo.client_id)
            if not webhook_url or not webhook_url.strip():
                logger.info(f"[RETRY] Mensagem {msg.id}: cliente {convo.client_id} sem URL configurada. Marcando como retry_exhausted.")
                msg.agentflow_webhook_status = "retry_exhausted"
                db.commit()
                continue

            payload = _rebuild_payload(msg, db)
            if not payload:
                logger.warning(f"[RETRY] Mensagem {msg.id}: nao foi possivel reconstruir o payload. Ignorando.")
                continue

            logger.info(f"[RETRY] Mensagem {msg.id} — Tentativa {attempt_num}/{MAX_RETRIES} para {webhook_url}")

            try:
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(webhook_url, json=payload)

                if 200 <= response.status_code < 300:
                    msg.agentflow_webhook_status = "success"
                    msg.agentflow_webhook_error = None
                    msg.agentflow_retry_count = attempt_num
                    db.commit()
                    logger.info(f"[RETRY] Mensagem {msg.id} reenviada com sucesso (HTTP {response.status_code}).")
                else:
                    raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")

            except Exception as e:
                new_retry_count = attempt_num
                if new_retry_count >= MAX_RETRIES:
                    msg.agentflow_webhook_status = "retry_exhausted"
                    msg.agentflow_retry_count = new_retry_count
                    msg.agentflow_webhook_error = str(e)
                    msg.agentflow_retry_at = None
                    logger.warning(
                        f"[RETRY] Mensagem {msg.id} esgotou todas as {MAX_RETRIES} tentativas. "
                        f"Status: retry_exhausted. Ultimo erro: {e}"
                    )
                else:
                    next_retry = _compute_next_retry_at(new_retry_count)
                    msg.agentflow_retry_count = new_retry_count
                    msg.agentflow_retry_at = next_retry
                    msg.agentflow_webhook_error = str(e)
                    logger.warning(
                        f"[RETRY] Mensagem {msg.id} falhou na tentativa {new_retry_count}/{MAX_RETRIES}. "
                        f"Proximo retry em: {next_retry.strftime('%H:%M:%S')}. Erro: {e}"
                    )
                db.commit()

    except Exception as err:
        logger.error(f"[RETRY] Erro no ciclo do worker: {err}")
    finally:
        db.close()


def start_webhook_retry_worker():
    """
    Inicia o worker de retry em uma thread daemon.
    Deve ser chamado no startup do FastAPI.
    """
    def loop():
        logger.info(f"[RETRY] Worker iniciado. Ciclo a cada {WORKER_INTERVAL_SECONDS}s, maximo {MAX_RETRIES} tentativas por mensagem.")
        while True:
            try:
                _process_retry_batch()
            except Exception as e:
                logger.error(f"[RETRY] Excecao nao tratada no loop principal: {e}")
            time.sleep(WORKER_INTERVAL_SECONDS)

    t = threading.Thread(target=loop, daemon=True, name="WebhookRetryWorker")
    t.start()
    logger.info("[RETRY] Thread do worker de retry iniciada.")

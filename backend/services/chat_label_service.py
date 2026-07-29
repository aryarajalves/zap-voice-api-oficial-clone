"""
Serviço para aplicação de etiquetas via Webhook / Automação com registro de histórico em tempo real no Chat Local.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Union, Optional
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

import models
from core.logger import setup_logger
from core.utils import robust_extract_labels
from services.utils.phone_utils import normalize_phone

logger = setup_logger("ChatLabelService")

def get_brasilia_now() -> datetime:
    """Retorna o datetime atual no fuso horário de Brasília (GMT-3 / America/Sao_Paulo)."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("America/Sao_Paulo"))
    except Exception:
        return datetime.now(timezone(timedelta(hours=-3)))

def apply_webhook_labels(
    db: Session,
    client_id: int,
    phone: str,
    raw_labels: Union[str, List[str]],
    source: str = "Webhook",
    contact_name: Optional[str] = None
) -> Optional[models.ChatConversation]:
    """
    Aplica etiquetas em uma conversa do Chat Local quando disparadas por um Webhook ou automação.
    Gera uma mensagem de sistema no histórico do chat com data e hora de Brasília.
    Dispara eventos WebSocket em tempo real.
    """
    if not phone or not raw_labels or not client_id:
        return None

    clean_labels = robust_extract_labels(raw_labels)
    if not clean_labels:
        return None

    clean_phone = normalize_phone(phone)
    if not clean_phone:
        clean_phone = "".join(filter(str.isdigit, str(phone)))

    if not clean_phone:
        return None

    suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    # Buscar ou criar a conversa local
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.phone.like(f"%{suffix}")
    ).first()

    is_new_convo = False
    if not convo:
        convo = models.ChatConversation(
            client_id=client_id,
            phone=clean_phone,
            contact_name=contact_name or clean_phone,
            status="open",
            unread_count=0,
            labels=[]
        )
        db.add(convo)
        db.flush()
        is_new_convo = True
        logger.info(f"🆕 [CHAT-LABEL-SERVICE] Conversa local criada para {clean_phone} (Client: {client_id})")

    current_labels = list(convo.labels) if isinstance(convo.labels, list) else []
    added_labels = []

    for lbl in clean_labels:
        if lbl not in current_labels:
            current_labels.append(lbl)
            added_labels.append(lbl)

    if not added_labels:
        logger.info(f"ℹ️ [CHAT-LABEL-SERVICE] Nenhuma etiqueta nova para adicionar na conversa #{convo.id}. Existentes: {current_labels}")
        return convo

    # Atualizar lista de etiquetas na conversa
    convo.labels = current_labels
    flag_modified(convo, "labels")

    # Formatar data e hora em Brasília
    now_br = get_brasilia_now()
    date_str = now_br.strftime("%d/%m/%Y")
    time_str = now_br.strftime("%H:%M")

    # Criar mensagem(ns) de sistema no chat
    system_messages = []
    for lbl in added_labels:
        content = f"Etiqueta '{lbl}' adicionada via {source} em {date_str} às {time_str}"
        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="system",
            message_type="text",
            content=content,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(msg)
        system_messages.append(msg)

    # Atualizar metadados da conversa
    last_msg_text = f"Etiqueta(s) '{', '.join(added_labels)}' adicionada(s) via {source}"
    convo.last_message_content = last_msg_text
    convo.last_message_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(convo)

    logger.info(f"✅ [CHAT-LABEL-SERVICE] Etiquetas {added_labels} adicionadas à conversa #{convo.id} via {source}. Mensagem de sistema criada ({date_str} às {time_str}).")

    # Publicar eventos em tempo real via RabbitMQ/WebSocket
    try:
        from rabbitmq_client import rabbitmq

        payload_convo = {
            "id": convo.id,
            "client_id": client_id,
            "phone": convo.phone,
            "contact_name": convo.contact_name,
            "status": convo.status,
            "unread_count": convo.unread_count,
            "last_message_content": convo.last_message_content,
            "last_message_at": convo.last_message_at.isoformat() if convo.last_message_at else None,
            "labels": convo.labels
        }

        for sys_msg in system_messages:
            db.refresh(sys_msg)
            payload_msg = {
                "id": sys_msg.id,
                "conversation_id": sys_msg.conversation_id,
                "sender_type": sys_msg.sender_type,
                "message_type": sys_msg.message_type,
                "content": sys_msg.content,
                "media_url": sys_msg.media_url,
                "meta_data": sys_msg.meta_data,
                "timestamp": sys_msg.timestamp.isoformat() if sys_msg.timestamp else datetime.now(timezone.utc).isoformat(),
                "client_id": client_id
            }
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(rabbitmq.publish_event("new_message", payload_msg))
                loop.create_task(rabbitmq.publish_event("conversation_updated", payload_convo))
            except RuntimeError:
                pass
    except Exception as ws_err:
        logger.warning(f"⚠️ [CHAT-LABEL-SERVICE] Não foi possível emitir evento real-time: {ws_err}")

    # Sincronização assíncrona opcional com Chatwoot se ativado
    try:
        from chatwoot_client import get_chatwoot_client_for_client
        cw_client = get_chatwoot_client_for_client(db, client_id)
        if cw_client:
            async def sync_cw():
                try:
                    conv_res = await cw_client.ensure_conversation(clean_phone, contact_name or clean_phone)
                    if conv_res and conv_res.get("conversation_id"):
                        await cw_client.add_label_to_conversation(conv_res["conversation_id"], added_labels)
                except Exception as cw_err:
                    logger.error(f"Erro ao sincronizar etiqueta com Chatwoot: {cw_err}")

            try:
                loop = asyncio.get_running_loop()
                loop.create_task(sync_cw())
            except RuntimeError:
                pass
    except Exception:
        pass

    return convo

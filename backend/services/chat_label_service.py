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
    raw_labels: Optional[Union[str, List[str]]] = None,
    source: str = "Webhook",
    contact_name: Optional[str] = None,
    remove_raw_labels: Optional[Union[str, List[str]]] = None
) -> Optional[models.ChatConversation]:
    """
    Aplica e/ou remove etiquetas em uma conversa do Chat Local quando disparadas por um Webhook, API ou automação.
    Gera uma mensagem de sistema no histórico do chat com data e hora de Brasília.
    Dispara eventos WebSocket em tempo real.
    """
    if not phone or not client_id:
        return None

    if not raw_labels and not remove_raw_labels:
        return None

    clean_labels = robust_extract_labels(raw_labels) if raw_labels else []
    clean_remove_labels = robust_extract_labels(remove_raw_labels) if remove_raw_labels else []

    if not clean_labels and not clean_remove_labels:
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
        logger.info(f"🆕 [CHAT-LABEL-SERVICE] Conversa local criada para {clean_phone} (Client: {client_id})")

    current_labels = list(convo.labels) if isinstance(convo.labels, list) else []
    added_labels = []
    removed_labels = []

    # Processar remoção de etiquetas
    if clean_remove_labels:
        clean_remove_lower = [l.lower() for l in clean_remove_labels]
        new_labels = []
        for lbl in current_labels:
            if lbl.lower() in clean_remove_lower:
                removed_labels.append(lbl)
            else:
                new_labels.append(lbl)
        current_labels = new_labels

    # Processar adição de etiquetas
    if clean_labels:
        for lbl in clean_labels:
            if not any(l.lower() == lbl.lower() for l in current_labels):
                current_labels.append(lbl)
                added_labels.append(lbl)

    if not added_labels and not removed_labels:
        logger.info(f"ℹ️ [CHAT-LABEL-SERVICE] Nenhuma alteração de etiqueta para a conversa #{convo.id}. Existentes: {current_labels}")
        return convo

    # Atualizar lista de etiquetas na conversa
    convo.labels = current_labels
    flag_modified(convo, "labels")

    # Atualizar human_handover_at se a etiqueta de humano for alterada
    try:
        from config_loader import get_setting
        human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
        if human_label:
            if any(l.lower() == human_label.lower() for l in added_labels) and not convo.human_handover_at:
                convo.human_handover_at = datetime.now(timezone.utc)
            elif any(l.lower() == human_label.lower() for l in removed_labels):
                convo.human_handover_at = None
    except Exception as e_human:
        logger.warning(f"⚠️ [CHAT-LABEL-SERVICE] Erro ao atualizar human_handover_at: {e_human}")

    # Formatar data e hora em Brasília
    now_br = get_brasilia_now()
    date_str = now_br.strftime("%d/%m/%Y")
    time_str = now_br.strftime("%H:%M")

    # Criar mensagem de sistema no chat
    parts = []
    if removed_labels:
        parts.append(f"Marcador(es) '{', '.join(removed_labels)}' removido(s)")
    if added_labels:
        parts.append(f"Marcador(es) '{', '.join(added_labels)}' adicionado(s)")

    content = f"{' e '.join(parts)} via {source} em {date_str} às {time_str}"

    msg = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="system",
        message_type="text",
        content=content,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(msg)
    system_messages = [msg]

    # Atualizar metadados da conversa
    convo.last_message_content = content
    convo.last_message_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(convo)

    logger.info(f"✅ [CHAT-LABEL-SERVICE] Conversa #{convo.id} atualizada via {source}. {content}")

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

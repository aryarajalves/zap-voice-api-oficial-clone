import asyncio
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm.attributes import flag_modified
import models
from core.logger import setup_logger
from config_loader import get_setting

logger = setup_logger("Worker.WhatsAppInbound.ChatRecorder")


def handle_reaction_message(db, chat_convo: models.ChatConversation, msg: dict) -> bool:
    """
    Processa mensagens do tipo 'reaction', atualizando o meta_data da mensagem alvo.
    Retorna True para indicar que o processamento do evento reaction foi concluído.
    """
    emoji = msg.get("reaction", {}).get("emoji", "")
    reacted_msg_id = msg.get("reaction", {}).get("message_id", "")
    if not reacted_msg_id:
        return True

    clean_reacted_id = reacted_msg_id.replace("wamid.", "")
    wamid_reacted_id = f"wamid.{clean_reacted_id}"
    target_msg = db.query(models.ChatMessage).filter(
        or_(
            models.ChatMessage.wa_message_id == reacted_msg_id,
            models.ChatMessage.wa_message_id == clean_reacted_id,
            models.ChatMessage.wa_message_id == wamid_reacted_id
        )
    ).first()

    if target_msg:
        existing_meta = dict(target_msg.meta_data or {})
        reactions = existing_meta.get("reactions", [])
        # Remove reação prévia do contato e substitui
        reactions = [r for r in reactions if r.get("sender") != "contact"]
        if emoji:  # emoji vazio = remover reação
            reactions.append({"emoji": emoji, "sender": "contact"})
        existing_meta["reactions"] = reactions
        target_msg.meta_data = existing_meta
        flag_modified(target_msg, "meta_data")
        db.commit()
        logger.info(f"❤️ [CHAT-REACTION] Reação '{emoji}' associada à mensagem ID {target_msg.id} ({reacted_msg_id})")

        # Transmitir atualização via WebSocket
        try:
            from rabbitmq_client import rabbitmq
            payload_ws = {
                "event": "message_reaction_updated",
                "data": {
                    "conversation_id": chat_convo.id,
                    "message_id": target_msg.id,
                    "wa_message_id": target_msg.wa_message_id,
                    "meta_data": existing_meta
                }
            }
            asyncio.create_task(rabbitmq.publish_event("message_reaction_updated", payload_ws))
        except Exception as e_ws:
            logger.error(f"Erro ao transmitir evento de reação WebSocket: {e_ws}")
    else:
        logger.info(f"⚠️ [CHAT-REACTION] Mensagem alvo {reacted_msg_id} não encontrada para conversa {chat_convo.id}")

    return True


def save_inbound_chat_message(
    db,
    target_cid: int,
    from_phone: str,
    raw_from: str,
    msg: dict,
    user_input: Optional[str],
    btn_activate_agent: Optional[bool],
    contacts_map: dict
) -> Optional[models.ChatConversation]:
    """Salva a mensagem recebida no chat local do ZapVoice."""
    suffix_inb = from_phone[-8:] if len(from_phone) >= 8 else from_phone
    chat_convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == target_cid,
        models.ChatConversation.phone.like(f"%{suffix_inb}")
    ).first()

    if not chat_convo:
        chat_convo = models.ChatConversation(
            client_id=target_cid,
            phone=from_phone,
            contact_name=contacts_map.get(raw_from, "Contato"),
            status="open",
            unread_count=0
        )
        db.add(chat_convo)
        db.flush()

    m_type = msg.get("type", "text")
    if m_type == "reaction":
        handle_reaction_message(db, chat_convo, msg)
        return None

    content_text = user_input
    media_url = None
    chat_meta = {}

    media_obj = msg.get(m_type)
    if isinstance(media_obj, dict) and "id" in media_obj:
        media_url = f"media_id:{media_obj['id']}"

    if m_type != "text" and not content_text:
        if m_type == "image":
            content_text = "📷 Imagem recebida"
        elif m_type == "audio":
            content_text = "🎵 Áudio recebido"
        elif m_type == "video":
            content_text = "🎥 Vídeo recebido"
        elif m_type == "document":
            content_text = "📄 Documento recebido"
            if isinstance(media_obj, dict) and media_obj.get("filename"):
                doc_filename = media_obj.get("filename")
                chat_meta["filename"] = doc_filename
        elif m_type == "sticker":
            content_text = "✨ Sticker recebido"
        else:
            content_text = f"📎 Arquivo ({m_type}) recebido"

    # Para cliques de botão: marcar skip_agentflow se activate_agent=False
    if btn_activate_agent is not None and not btn_activate_agent:
        chat_meta["skip_agentflow"] = True

    context = msg.get("context", {})
    replied_msg_id = context.get("id")
    formatted_inbound_quoted_id = None
    if replied_msg_id:
        formatted_inbound_quoted_id = replied_msg_id if replied_msg_id.startswith("wamid.") else f"wamid.{replied_msg_id}"

    chat_message = models.ChatMessage(
        conversation_id=chat_convo.id,
        sender_type="contact",
        message_type=m_type,
        content=content_text,
        media_url=media_url,
        wa_message_id=msg.get("id"),
        quoted_message_id=formatted_inbound_quoted_id,
        meta_data=chat_meta if chat_meta else None
    )
    db.add(chat_message)

    chat_convo.last_message_content = content_text
    chat_convo.last_message_at = datetime.now(timezone.utc)
    chat_convo.unread_count += 1
    chat_convo.status = "open"
    chat_convo.last_contact_message_at = datetime.now(timezone.utc)

    db.commit()
    logger.info(f"💾 [CHAT-LOCAL] Mensagem de {from_phone} salva localmente (Convo ID: {chat_convo.id})")
    return chat_convo


def dispatch_ai_memory(
    db,
    target_cid: int,
    from_phone: str,
    raw_from: str,
    user_input: Optional[str],
    msg: dict,
    is_btn_pre: bool,
    btn_activate_agent: Optional[bool],
    contacts_map: dict
):
    """Notifica webhook de memória de inteligência artificial de forma assíncrona se aplicável."""
    if not user_input:
        return

    try:
        from services.ai_memory import notify_agent_memory_webhook
        chat_webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=target_cid)
        memory_webhook_url = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=target_cid)

        is_btn = msg.get("type") in ["button", "interactive"]
        same_url = (
            chat_webhook_url and memory_webhook_url and
            chat_webhook_url.strip().rstrip("/") == memory_webhook_url.strip().rstrip("/")
        )

        if is_btn_pre and btn_activate_agent is False:
            logger.info(f"⏭️ [MEMORIA-INBOUND] Botão '{user_input}' com activate_agent=False — memória inbound não notificada ({from_phone})")
        elif is_btn_pre and btn_activate_agent is True:
            logger.info(f"⏭️ [MEMORIA-INBOUND] Botão '{user_input}' com activate_agent=True — enviado apenas para o AgentFlow/Chat Webhook, pulando memória ({from_phone})")
        elif not is_btn:
            logger.info(f"⏭️ [MEMORIA-INBOUND] Mensagem comum do usuário '{user_input}' — pulando memória inbound ({from_phone})")
        elif same_url:
            logger.info(f"⏭️ [MEMORIA-INBOUND] CHAT_MESSAGES_WEBHOOK_URL == AGENT_MEMORY_WEBHOOK_URL — pulando memória inbound para evitar duplicata ({from_phone})")
        else:
            lead_id = None
            try:
                suffix_lead = from_phone[-8:] if len(from_phone) >= 8 else from_phone
                lead_obj = db.query(models.WebhookLead).filter(
                    models.WebhookLead.client_id == target_cid,
                    or_(
                        models.WebhookLead.phone == from_phone,
                        models.WebhookLead.phone.like(f"%{suffix_lead}")
                    )
                ).first()
                if lead_obj:
                    lead_id = lead_obj.id
            except Exception:
                pass

            logger.info(f"🧠 [MEMORIA-INBOUND] Agendando envio de memória do usuário: '{user_input}' (botão: {is_btn}) ({from_phone})")
            asyncio.create_task(notify_agent_memory_webhook(
                client_id=target_cid,
                phone=from_phone,
                name=contacts_map.get(raw_from, "Contato"),
                template_name="Clique de Botão" if is_btn else "Mensagem do Usuário",
                content=user_input,
                internal_contact_id=lead_id,
                dono="usuario",
                is_button_click=is_btn
            ))
    except Exception as e_mem_inbound:
        logger.error(f"❌ Erro ao enviar memória de entrada (inbound): {e_mem_inbound}")

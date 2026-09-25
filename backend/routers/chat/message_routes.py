import sys
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from core.clients.whatsapp.client import WhatsAppClient
from chatwoot_client import ChatwootClient
from services.chat_media_service import upload_media_to_meta_from_url
from .common import get_client_id

# Import sub-routers
from .message_media_routes import (
    router as media_router,
    list_conversation_media,
    proxy_whatsapp_media,
    send_chat_media_message,
)
from .message_template_routes import (
    router as template_router,
    send_chat_template,
)
from .message_action_routes import (
    router as action_router,
    delete_chat_message,
    resend_message_to_agentflow,
    react_to_message,
)

logger = setup_logger("ChatRouter.Messages")

router = APIRouter()
router.include_router(media_router)
router.include_router(template_router)
router.include_router(action_router)


def _get_whatsapp_client(*args, **kwargs):
    chat_mod = sys.modules.get("routers.chat")
    cls = getattr(chat_mod, "WhatsAppClient", WhatsAppClient) if chat_mod else WhatsAppClient
    return cls(*args, **kwargs)


def _get_chatwoot_client(*args, **kwargs):
    chat_mod = sys.modules.get("routers.chat")
    cls = getattr(chat_mod, "ChatwootClient", ChatwootClient) if chat_mod else ChatwootClient
    return cls(*args, **kwargs)


@router.get("/chat/conversations/{conversation_id}/messages")
@router.get("/v1/accounts/{account_id}/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: int,
    account_id: Optional[int] = None,
    limit: Optional[int] = Query(50, ge=0),
    before_id: Optional[int] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    convo.unread_count = 0
    db.commit()

    query = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    )

    if before_id is not None:
        query = query.filter(models.ChatMessage.id < before_id)

    if limit and limit > 0:
        messages = query.order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).limit(limit).all()
    else:
        messages = query.order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).all()
    messages.reverse()

    result = []
    for m in messages:
        result.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_type": m.sender_type,
            "user_id": m.user_id,
            "message_type": m.message_type,
            "content": m.content,
            "media_url": m.media_url,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "wa_message_id": m.wa_message_id,
            "meta_data": m.meta_data,
            "status": getattr(m, 'status', None) or (m.meta_data.get("status") if m.meta_data else "sent"),
            "quoted_message_id": m.quoted_message_id,
            "is_starred": bool(m.is_starred or (m.meta_data and m.meta_data.get("is_starred")))
        })
    return result


@router.post("/chat/conversations/{conversation_id}/messages")
@router.post("/v1/accounts/{account_id}/conversations/{conversation_id}/messages")
async def send_chat_message(
    conversation_id: int,
    payload: dict,
    account_id: Optional[int] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    content = payload.get("content")
    is_private = payload.get("is_private", False)
    quoted_wa_message_id = payload.get("quoted_wa_message_id")
    if not content:
        raise HTTPException(status_code=400, detail="O conteúdo da mensagem é obrigatório.")

    wa_msg_id = None
    sender_type = "user"

    if is_private:
        sender_type = "system"
    else:
        if convo.last_contact_message_at:
            last_msg_time = convo.last_contact_message_at
            if last_msg_time.tzinfo is None:
                last_msg_time = last_msg_time.replace(tzinfo=timezone.utc)

            now_utc = datetime.now(timezone.utc)
            diff = now_utc - last_msg_time
            if diff.total_seconds() > 24 * 3600:
                raise HTTPException(
                    status_code=403,
                    detail="Janela de 24 horas expirada. A API oficial do WhatsApp só permite enviar mensagens livres caso o cliente tenha interagido nas últimas 24 horas."
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="Nenhuma mensagem recebida deste cliente. A janela de 24 horas precisa ser iniciada por uma mensagem de entrada do cliente."
            )

        wa_client = _get_whatsapp_client(client_id=client_id)
        try:
            response = await wa_client.send_text_official(convo.phone, content, quoted_message_id=quoted_wa_message_id)
            if isinstance(response, dict) and response.get("error"):
                logger.error(f"❌ Erro de envio de WhatsApp: {response}")
                raise HTTPException(status_code=400, detail=response.get("detail") or "Erro ao enviar mensagem pelo WhatsApp.")
        except Exception as e:
            logger.error(f"❌ Falha ao chamar a API do WhatsApp: {e}")
            raise HTTPException(status_code=500, detail=f"Erro de comunicação com o WhatsApp: {str(e)}")

        if isinstance(response, dict) and "messages" in response:
            wa_msg_id = response["messages"][0].get("id")

    meta_data = payload.get("meta_data") or payload.get("metadata")
    if not meta_data and any(k in payload for k in ["cost", "total_cost", "ai_cost", "router_cost", "agent_cost", "usage", "processing_steps"]):
        meta_data = {
            k: payload[k] for k in ["cost", "total_cost", "ai_cost", "router_cost", "agent_cost", "usage", "processing_steps"] if k in payload
        }

    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type=sender_type,
        user_id=current_user.id,
        message_type="text",
        content=content,
        wa_message_id=wa_msg_id,
        meta_data=meta_data,
        quoted_message_id=quoted_wa_message_id if not is_private else None
    )
    db.add(new_message)

    if not is_private:
        convo.last_message_content = content
        convo.last_message_at = datetime.now(timezone.utc)
    db.commit()

    if not is_private:
        try:
            from services.ai_memory import notify_agent_memory_webhook
            import asyncio
            asyncio.create_task(
                notify_agent_memory_webhook(
                    client_id=client_id,
                    phone=convo.phone,
                    name=convo.contact_name,
                    template_name="Mensagem do Atendente",
                    content=content,
                    internal_contact_id=convo.id,
                    dono="atendente"
                )
            )
        except Exception as memory_err:
            logger.error(f"Erro ao disparar webhook de memoria para mensagem de atendente: {memory_err}")

    try:
        from rabbitmq_client import rabbitmq
        payload_ws = {
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_type": new_message.sender_type,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
            "wa_message_id": new_message.wa_message_id,
            "status": "sent",
            "meta_data": new_message.meta_data,
            "client_id": client_id
        }
        await rabbitmq.publish_event("new_message", payload_ws)
    except Exception as e_ws:
        logger.error(f"Erro no broadcast de mensagem enviada: {e_ws}")

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": new_message.wa_message_id,
        "status": "sent",
        "meta_data": new_message.meta_data,
        "quoted_message_id": new_message.quoted_message_id
    }

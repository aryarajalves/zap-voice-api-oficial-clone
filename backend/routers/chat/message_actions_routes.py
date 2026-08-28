import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import or_

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from .common import get_client_id

logger = setup_logger("ChatRouter.MessageActions")

router = APIRouter()


@router.post("/chat/conversations/{conversation_id}/messages/{message_id}/pin", summary="Fixar ou desafixar uma mensagem na conversa")
async def toggle_pin_message(
    conversation_id: int,
    message_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Alterna a fixação de uma mensagem no topo da conversa.
    Se a mensagem já estiver fixada, desafixa.
    Caso contrário, fixa esta mensagem substituindo qualquer mensagem fixada anterior.
    """
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        logger.warning(f"⚠️ [PIN_MSG] Conversa {conversation_id} não encontrada para o client {client_id}")
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    msg = db.query(models.ChatMessage).filter(
        models.ChatMessage.id == message_id,
        models.ChatMessage.conversation_id == conversation_id
    ).first()
    if not msg:
        logger.warning(f"⚠️ [PIN_MSG] Mensagem {message_id} não encontrada na conversa {conversation_id}")
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")

    if convo.pinned_message_id == msg.id:
        convo.pinned_message_id = None
        action = "unpinned"
        logger.info(f"📌 [PIN_MSG] Mensagem {message_id} desafixada da conversa {conversation_id}")
    else:
        convo.pinned_message_id = msg.id
        action = "pinned"
        logger.info(f"📌 [PIN_MSG] Mensagem {message_id} fixada na conversa {conversation_id}")

    db.commit()

    try:
        from rabbitmq_client import rabbitmq
        payload_ws = {
            "conversation_id": convo.id,
            "pinned_message_id": convo.pinned_message_id,
            "action": action,
            "client_id": client_id
        }
        await rabbitmq.publish_event("message_pin_updated", payload_ws)
    except Exception as e_ws:
        logger.error(f"Erro ao emitir broadcast de mensagem fixada: {e_ws}")

    return {
        "status": "success",
        "conversation_id": convo.id,
        "pinned_message_id": convo.pinned_message_id,
        "action": action
    }


@router.post("/chat/conversations/{conversation_id}/messages/{message_id}/star", summary="Favoritar ou desfavoritar uma mensagem")
async def toggle_star_message(
    conversation_id: int,
    message_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Alterna o status de favorita de uma mensagem.
    """
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        logger.warning(f"⚠️ [STAR_MSG] Conversa {conversation_id} não encontrada para o client {client_id}")
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    msg = db.query(models.ChatMessage).filter(
        models.ChatMessage.id == message_id,
        models.ChatMessage.conversation_id == conversation_id
    ).first()
    if not msg:
        logger.warning(f"⚠️ [STAR_MSG] Mensagem {message_id} não encontrada na conversa {conversation_id}")
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")

    currently_starred = bool(msg.is_starred or (msg.meta_data and isinstance(msg.meta_data, dict) and msg.meta_data.get("is_starred")))
    new_starred = not currently_starred

    msg.is_starred = new_starred
    meta = dict(msg.meta_data or {})
    meta["is_starred"] = new_starred
    msg.meta_data = meta
    flag_modified(msg, "meta_data")
    db.commit()

    logger.info(f"⭐ [STAR_MSG] Mensagem {message_id} {'favoritada' if new_starred else 'desfavoritada'} na conversa {conversation_id}")

    try:
        from rabbitmq_client import rabbitmq
        payload_ws = {
            "conversation_id": convo.id,
            "message_id": msg.id,
            "is_starred": new_starred,
            "client_id": client_id
        }
        await rabbitmq.publish_event("message_star_updated", payload_ws)
    except Exception as e_ws:
        logger.error(f"Erro ao emitir broadcast de mensagem favorita: {e_ws}")

    return {
        "status": "success",
        "conversation_id": convo.id,
        "message_id": msg.id,
        "is_starred": new_starred
    }


@router.get("/chat/conversations/{conversation_id}/starred-messages", summary="Listar mensagens favoritas de uma conversa com paginação")
async def list_starred_messages(
    conversation_id: int,
    page: int = 1,
    limit: int = 20,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna a lista paginada de todas as mensagens marcadas como favoritas na conversa.
    """
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    page = max(1, page)
    limit = max(1, min(100, limit))

    query = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id,
        models.ChatMessage.is_starred == True
    )

    total = query.count()
    pages = (total + limit - 1) // limit if limit > 0 else 1
    skip = (page - 1) * limit

    paged_messages = query.order_by(
        models.ChatMessage.timestamp.desc(),
        models.ChatMessage.id.desc()
    ).offset(skip).limit(limit).all()

    result = []
    for m in paged_messages:
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
            "quoted_message_id": m.quoted_message_id,
            "is_starred": True
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "per_page": limit,
        "pages": pages
    }

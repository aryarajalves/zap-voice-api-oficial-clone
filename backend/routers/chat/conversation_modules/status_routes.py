from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from ..common import get_client_id
from .conversation_filter_helpers import build_conversation_filter_query

logger = setup_logger("ChatRouter.ConversationStatus")

router = APIRouter()


@router.post("/chat/conversations/{conversation_id}/status")
async def update_conversation_status(
    conversation_id: int,
    payload: dict,
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

    status = payload.get("status")
    if status not in ["open", "resolved", "archived"]:
        raise HTTPException(status_code=400, detail="Status inválido. Use 'open', 'resolved' ou 'archived'.")

    convo.status = status
    db.commit()
    return {"status": "ok", "conversation_status": convo.status}


@router.post("/chat/conversations/{conversation_id}/archive")
async def toggle_archive_conversation(
    conversation_id: int,
    payload: Optional[dict] = None,
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

    if payload and isinstance(payload, dict) and "archived" in payload:
        target_archived = bool(payload.get("archived"))
    else:
        target_archived = convo.status != "archived"

    convo.status = "archived" if target_archived else "open"
    db.commit()
    return {
        "status": "ok",
        "conversation_id": convo.id,
        "conversation_status": convo.status,
        "is_archived": convo.status == "archived"
    }


@router.post("/chat/conversations/bulk-archive")
async def bulk_archive_conversations(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    target_status = "archived" if payload.get("archived", True) else "open"
    select_all_pages = payload.get("select_all_pages", False)

    if select_all_pages:
        query = build_conversation_filter_query(
            db=db,
            client_id=client_id,
            current_user=current_user,
            tab=payload.get("tab", "todos"),
            status=payload.get("status", "open"),
            unread_only=payload.get("unread_only"),
            window_open_only=payload.get("window_open_only"),
            urgent_only=payload.get("urgent_only"),
            has_replied=payload.get("has_replied"),
            has_active_funnel=payload.get("has_active_funnel"),
            start_date=payload.get("start_date"),
            end_date=payload.get("end_date"),
            search=payload.get("search"),
            has_note=payload.get("has_note"),
            excluded_ids=payload.get("excluded_ids")
        )

        convos = query.all()

        from services.chat_label_service import filter_conversations_by_labels
        convos = filter_conversations_by_labels(
            conversations=convos,
            label=payload.get("label"),
            labels=payload.get("labels"),
            include_labels=payload.get("include_labels"),
            label_mode=payload.get("label_mode", "has"),
            label_op=payload.get("label_op", "or"),
            exclude_labels=payload.get("exclude_labels"),
            exclude_label_op=payload.get("exclude_label_op", "or")
        )
    else:
        ids = payload.get("ids", [])
        if not ids:
            raise HTTPException(status_code=400, detail="Nenhum ID fornecido.")
        convos = db.query(models.ChatConversation).filter(
            models.ChatConversation.id.in_(ids),
            models.ChatConversation.client_id == client_id
        ).all()

    updated_count = len(convos)
    for c in convos:
        c.status = target_status
    db.commit()

    return {
        "status": "ok",
        "updated_count": updated_count,
        "target_status": target_status
    }

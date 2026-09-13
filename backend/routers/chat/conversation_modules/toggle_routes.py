from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from ..common import get_client_id

logger = setup_logger("ChatRouter.ConversationToggles")

router = APIRouter()


@router.post("/chat/conversations/{conversation_id}/assign")
async def assign_conversation(
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

    user_id = payload.get("user_id")
    old_assigned = convo.assigned_user.full_name if convo.assigned_user else None

    if user_id is not None:
        target_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=400, detail="Usuário não encontrado para atribuição.")
        convo.assigned_user_id = user_id
        new_assigned = target_user.full_name

        event_text = f"O atendente {current_user.full_name or current_user.email} atribuiu a conversa para {new_assigned}"
        system_msg = models.ChatMessage(
            conversation_id=conversation_id,
            sender_type="system",
            message_type="text",
            content=event_text,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(system_msg)
    else:
        convo.assigned_user_id = None
        if old_assigned:
            event_text = f"O atendente {current_user.full_name or current_user.email} removeu a atribuição de {old_assigned}"
            system_msg = models.ChatMessage(
                conversation_id=conversation_id,
                sender_type="system",
                message_type="text",
                content=event_text,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(system_msg)

    db.commit()
    return {
        "status": "ok",
        "assigned_user_id": convo.assigned_user_id,
        "assigned_user_name": convo.assigned_user.full_name if convo.assigned_user else None
    }


@router.post("/chat/conversations/{conversation_id}/read")
async def mark_as_read(
    conversation_id: int,
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
    return {"status": "ok"}


@router.post("/chat/conversations/{conversation_id}/pin")
async def toggle_pin_conversation(
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

    pinned = payload.get("pinned", False)
    convo.pinned = pinned
    db.commit()
    return {"status": "ok", "pinned": convo.pinned}


@router.post("/chat/conversations/{conversation_id}/urgent")
async def toggle_urgent_conversation(
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

    urgent = payload.get("urgent", False)
    convo.urgent = urgent
    db.commit()
    return {"status": "ok", "urgent": convo.urgent}


@router.post("/chat/conversations/{conversation_id}/reset-24h-window")
async def reset_24h_window(
    conversation_id: int,
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

    old_time = datetime.now(timezone.utc) - timedelta(hours=25)
    convo.last_contact_message_at = old_time

    target_phone = convo.phone or getattr(convo, 'contact_phone', None)
    if target_phone:
        clean_phone = ''.join(filter(str.isdigit, str(target_phone)))
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

        db.query(models.ContactWindow).filter(
            models.ContactWindow.client_id == client_id,
            or_(
                models.ContactWindow.phone == clean_phone,
                models.ContactWindow.phone.like(f"%{suffix}")
            )
        ).delete(synchronize_session=False)

        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            or_(
                models.ContactTemplateHistory.phone == clean_phone,
                models.ContactTemplateHistory.phone.like(f"%{suffix}")
            )
        ).delete(synchronize_session=False)

        db.query(models.MessageStatus).filter(
            or_(
                models.MessageStatus.phone_number == clean_phone,
                models.MessageStatus.phone_number.like(f"%{suffix}")
            ),
            models.MessageStatus.trigger_id.is_(None)
        ).delete(synchronize_session=False)

    window_labels_setting = get_setting("AUTO_REMOVE_WINDOW_LABELS", "", client_id=client_id)
    if window_labels_setting and convo.labels:
        target_labels = [l.strip().lower() for l in window_labels_setting.split(",") if l.strip()]
        if target_labels:
            convo.labels = [lbl for lbl in convo.labels if lbl.lower() not in target_labels]

    db.commit()
    db.refresh(convo)

    logger.info(f"🧹 [RESET_24H_WINDOW] Janela de 24h e ContactWindow zeradas para conversa #{conversation_id} (Telefone: {convo.phone}) por Client {client_id}.")

    return {
        "status": "ok",
        "message": "Janela de 24h e histórico de interações zerados com sucesso.",
        "conversation": {
            "id": convo.id,
            "labels": convo.labels,
            "last_contact_message_at": convo.last_contact_message_at.isoformat() if convo.last_contact_message_at else None
        }
    }

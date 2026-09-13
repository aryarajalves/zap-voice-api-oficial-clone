from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from ..common import get_client_id

logger = setup_logger("ChatRouter.Notes")

router = APIRouter()


@router.post("/chat/conversations/{conversation_id}/note")
async def update_conversation_note(
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

    private_note = payload.get("private_note", "").strip()
    if not private_note:
        raise HTTPException(status_code=400, detail="A anotação privada não pode estar vazia.")
    convo.private_note = private_note
    
    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="system",
        user_id=current_user.id,
        message_type="text",
        content=f"🔒 Anotação Privada: {private_note}",
    )
    db.add(new_message)
    
    convo.last_message_content = f"🔒 Nota: {private_note}"
    convo.last_message_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"status": "ok", "private_note": convo.private_note, "message": {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": None
    }}


@router.put("/chat/conversations/{conversation_id}/notes/{message_id}")
async def update_private_note_message(
    conversation_id: int,
    message_id: int,
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

    msg = db.query(models.ChatMessage).filter(
        models.ChatMessage.id == message_id,
        models.ChatMessage.conversation_id == conversation_id
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Anotação não encontrada.")

    private_note = payload.get("private_note", "").strip()
    if not private_note:
        raise HTTPException(status_code=400, detail="O conteúdo da anotação não pode ser vazio.")

    msg.content = f"🔒 Anotação Privada: {private_note}"
    convo.private_note = private_note
    db.commit()

    return {
        "status": "ok",
        "private_note": convo.private_note,
        "message": {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_type": msg.sender_type,
            "user_id": msg.user_id,
            "message_type": msg.message_type,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat() if msg.timestamp else datetime.now().isoformat(),
            "wa_message_id": msg.wa_message_id
        }
    }

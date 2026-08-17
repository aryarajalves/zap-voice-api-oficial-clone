from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from .common import get_client_id

logger = setup_logger("ChatRouter.MessageSearch")

router = APIRouter()


@router.get(
    "/chat/conversations/{conversation_id}/search-messages",
    summary="Pesquisar e filtrar mensagens dentro de uma conversa específica"
)
async def search_conversation_messages(
    conversation_id: int,
    query: Optional[str] = Query(None, description="Texto para buscar nas mensagens"),
    date: Optional[str] = Query(None, description="Data específica no formato YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=100, description="Quantidade máxima de mensagens retornadas"),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pesquisa mensagens na conversa ativa por texto ou por data específica,
    retornando histórico formatado para o painel de pesquisa estilo WhatsApp.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()

    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    db_query = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    )

    if query and query.strip():
        term = f"%{query.strip()}%"
        db_query = db_query.filter(models.ChatMessage.content.ilike(term))

    if date and date.strip():
        try:
            target_date = datetime.strptime(date.strip(), "%Y-%m-%d").date()
            db_query = db_query.filter(
                func.date(models.ChatMessage.timestamp) == target_date
            )
        except ValueError:
            logger.warning(f"Data inválida recebida na pesquisa de mensagens: {date}")

    messages = db_query.order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).limit(limit).all()

    result = []
    for m in messages:
        result.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_type": m.sender_type,
            "message_type": m.message_type,
            "content": m.content,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "media_url": m.media_url,
            "wa_message_id": m.wa_message_id
        })

    return {
        "conversation_id": conversation_id,
        "query": query or "",
        "date": date or "",
        "total": len(result),
        "messages": result
    }

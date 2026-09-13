from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from ..common import get_client_id

logger = setup_logger("ChatRouter.HumanHandover")

router = APIRouter()


@router.get("/chat/agents")
async def list_chat_agents(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    agents = (
        db.query(models.User)
        .outerjoin(models.user_clients, models.user_clients.c.user_id == models.User.id)
        .filter(
            models.User.is_active == True,
            or_(
                models.User.client_id == client_id,
                models.user_clients.c.client_id == client_id,
                models.User.role == "super_admin"
            )
        )
        .distinct()
        .all()
    )

    return [
        {"id": a.id, "full_name": a.full_name or a.email, "email": a.email}
        for a in agents
    ]


@router.get("/chat/human-conversations")
async def list_human_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    if not human_label:
        return {"total": 0, "data": []}

    conversations = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.status == "open"
    ).all()

    clean_human_label = human_label.lower()
    human_convos = []
    for c in conversations:
        if isinstance(c.labels, list) and clean_human_label in [l.lower() for l in c.labels]:
            handover_iso = c.human_handover_at.isoformat() if c.human_handover_at else c.last_message_at.isoformat() if c.last_message_at else None
            human_convos.append({
                "id": c.id,
                "phone": c.phone,
                "contact_name": c.contact_name or c.phone,
                "human_handover_at": handover_iso,
                "last_message_content": c.last_message_content,
                "labels": c.labels
            })

    total = len(human_convos)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_convos = human_convos[start_idx:end_idx]

    return {
        "total": total,
        "data": paginated_convos
    }


@router.post("/chat/conversations/{conversation_id}/finish-human-handover")
async def finish_human_handover(
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

    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    robo_label = get_setting("WA_ROBO_LABEL", "", client_id=client_id).strip()

    from services.chat_label_service import apply_webhook_labels
    user_name = current_user.full_name or current_user.email
    updated_convo = apply_webhook_labels(
        db=db,
        client_id=client_id,
        phone=convo.phone,
        raw_labels=robo_label if robo_label else None,
        remove_raw_labels=human_label if human_label else None,
        source=f"Atendente ({user_name})",
        contact_name=convo.contact_name
    )
    if updated_convo:
        updated_convo.human_handover_at = None
        db.commit()
        return {"status": "success", "labels": updated_convo.labels}
    return {"status": "success"}


@router.post("/chat/conversations/bulk-finish-human-handover")
async def bulk_finish_human_handover(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="Nenhum ID fornecido.")

    convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.id.in_(ids),
        models.ChatConversation.client_id == client_id
    ).all()

    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    robo_label = get_setting("WA_ROBO_LABEL", "", client_id=client_id).strip()
    from services.chat_label_service import apply_webhook_labels
    user_name = current_user.full_name or current_user.email

    count = 0
    for convo in convos:
        if human_label or robo_label:
            apply_webhook_labels(
                db=db,
                client_id=client_id,
                phone=convo.phone,
                raw_labels=robo_label if robo_label else None,
                remove_raw_labels=human_label if human_label else None,
                source=f"Atendente ({user_name})",
                contact_name=convo.contact_name
            )
        convo.human_handover_at = None
        count += 1

    db.commit()
    return {"status": "success", "count": count}

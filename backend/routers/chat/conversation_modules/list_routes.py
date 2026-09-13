from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from ..common import get_client_id
from .conversation_filter_helpers import (
    build_conversation_filter_query,
    get_blocked_and_resting_data,
    get_block_info,
    get_active_funnels_map,
)

logger = setup_logger("ChatRouter.ConversationList")

router = APIRouter()


@router.post("/chat/conversations/get-or-create")
async def get_or_create_conversation(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    phone = payload.get("phone")
    contact_name = payload.get("contact_name") or payload.get("name") or "Lead"
    if not phone:
        raise HTTPException(status_code=400, detail="Telefone é obrigatório")

    clean_phone = "".join(filter(str.isdigit, str(phone)))
    last8 = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    all_convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id
    ).all()

    convo = None
    for c in all_convos:
        c_phone_digits = "".join(filter(str.isdigit, str(c.phone or "")))
        if c_phone_digits == clean_phone or (len(c_phone_digits) >= 8 and c_phone_digits[-8:] == last8):
            convo = c
            break

    if not convo:
        convo = models.ChatConversation(
            client_id=client_id,
            phone=clean_phone,
            contact_name=contact_name,
            status="open"
        )
        db.add(convo)
        db.commit()
        db.refresh(convo)

    return {
        "id": convo.id,
        "phone": convo.phone,
        "contact_name": convo.contact_name,
        "last_contact_message_at": convo.last_contact_message_at.isoformat() if convo.last_contact_message_at else None
    }


@router.get("/chat/conversations")
async def list_conversations(
    tab: str = "todos",
    status: str = "open",
    search: Optional[str] = None,
    label: Optional[str] = None,
    block_status: Optional[str] = None,
    has_note: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    unread_only: Optional[bool] = None,
    window_open_only: Optional[bool] = None,
    template_sent_24h_only: Optional[bool] = None,
    urgent_only: Optional[bool] = None,
    has_replied: Optional[bool] = None,
    has_active_funnel: Optional[bool] = None,
    order_by: str = "recent",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not isinstance(page, int):
        page = 1
    if not isinstance(limit, int):
        limit = 20

    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    query = build_conversation_filter_query(
        db=db,
        client_id=client_id,
        current_user=current_user,
        tab=tab,
        status=status,
        unread_only=unread_only,
        window_open_only=window_open_only,
        template_sent_24h_only=template_sent_24h_only,
        urgent_only=urgent_only,
        has_replied=has_replied,
        has_active_funnel=has_active_funnel,
        start_date=start_date,
        end_date=end_date,
        search=search,
        has_note=has_note,
        order_by=order_by
    )

    conversations = query.all()

    if label:
        clean_label = label.strip().lower()
        conversations = [
            c for c in conversations
            if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
        ]

    blocked_suffixes, resting_map = get_blocked_and_resting_data(db, client_id)
    active_funnels_map = get_active_funnels_map(db, client_id)

    result = []
    for c in conversations:
        block_type, resting_until = get_block_info(c.phone, blocked_suffixes, resting_map)

        if block_status and block_type != block_status:
            continue

        digits = "".join(filter(str.isdigit, c.phone or ""))
        suffix_key = digits[-8:] if len(digits) >= 8 else None
        active_funnel = active_funnels_map.get(suffix_key) if suffix_key else None

        result.append({
            "id": c.id,
            "client_id": c.client_id,
            "phone": c.phone,
            "contact_name": c.contact_name,
            "last_message_content": c.last_message_content,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "status": c.status,
            "unread_count": c.unread_count,
            "assigned_user_id": c.assigned_user_id,
            "assigned_user_name": c.assigned_user.full_name if c.assigned_user else None,
            "labels": c.labels or [],
            "last_contact_message_at": c.last_contact_message_at.isoformat() if c.last_contact_message_at else None,
            "pinned": c.pinned,
            "urgent": c.urgent,
            "pinned_message_id": c.pinned_message_id,
            "private_note": c.private_note,
            "block_status": block_type,
            "resting_until": resting_until.isoformat() if resting_until else None,
            "active_funnel": active_funnel
        })

    total_count = len(result)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_result = result[start_idx:end_idx]

    return {
        "conversations": paginated_result,
        "total_count": total_count,
        "page": page,
        "limit": limit
    }

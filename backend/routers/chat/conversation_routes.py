import random
from datetime import datetime, timezone, timedelta, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from .common import get_client_id

logger = setup_logger("ChatRouter.Conversations")

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

    query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)

    if status != "all":
        query = query.filter(models.ChatConversation.status == status)

    if unread_only:
        query = query.filter(models.ChatConversation.unread_count > 0)

    if window_open_only:
        limit_time = datetime.utcnow() - timedelta(hours=24)
        query = query.filter(models.ChatConversation.last_contact_message_at >= limit_time)

    if template_sent_24h_only:
        since_24h = datetime.utcnow() - timedelta(hours=24)
        
        chat_convo_ids = [
            r[0] for r in db.query(models.ChatMessage.conversation_id)
            .filter(
                models.ChatMessage.timestamp >= since_24h,
                or_(
                    models.ChatMessage.message_type.in_(['template', 'TEMPLATE']),
                    models.ChatMessage.content.like('%[Template:%'),
                    models.ChatMessage.content.like('%template%')
                )
            ).distinct().all() if r[0]
        ]
        
        raw_phones = [
            r[0] for r in db.query(models.MessageStatus.phone_number)
            .filter(
                models.MessageStatus.timestamp >= since_24h,
                models.MessageStatus.status.in_(['sent', 'delivered', 'read', 'SENT', 'DELIVERED', 'READ']),
                or_(
                    models.MessageStatus.message_type.in_(['TEMPLATE', 'template']),
                    models.MessageStatus.template_name.isnot(None)
                )
            ).distinct().all() if r[0]
        ]
        
        clean_phones = set()
        clean_phones_no_plus = set()
        for p in raw_phones:
            p_clean = str(p).replace('+', '').strip()
            if p_clean:
                clean_phones.add(p_clean)
                clean_phones.add(f"+{p_clean}")
                clean_phones_no_plus.add(p_clean)
        
        conditions = []
        if chat_convo_ids:
            conditions.append(models.ChatConversation.id.in_(chat_convo_ids))
        if clean_phones:
            conditions.append(models.ChatConversation.phone.in_(list(clean_phones)))
            conditions.append(func.replace(models.ChatConversation.phone, '+', '').in_(list(clean_phones_no_plus)))
            
        if conditions:
            query = query.filter(or_(*conditions))
        else:
            query = query.filter(models.ChatConversation.id == -1)

    if urgent_only:
        query = query.filter(models.ChatConversation.urgent == True)

    if has_replied:
        query = query.filter(models.ChatConversation.last_contact_message_at.isnot(None))

    if has_active_funnel:
        raw_active_phones = [
            r[0] for r in db.query(models.ScheduledTrigger.contact_phone)
            .filter(
                models.ScheduledTrigger.client_id == client_id,
                models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended']),
                models.ScheduledTrigger.contact_phone.isnot(None)
            ).all() if r[0]
        ]
        
        clean_suffixes = set()
        for p in raw_active_phones:
            digits = "".join(filter(str.isdigit, str(p)))
            if len(digits) >= 8:
                clean_suffixes.add(digits[-8:])
        
        if clean_suffixes:
            funnel_conditions = [models.ChatConversation.phone.like(f"%{suf}") for suf in clean_suffixes]
            query = query.filter(or_(*funnel_conditions))
        else:
            query = query.filter(models.ChatConversation.id == -1)

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.ChatConversation.last_message_at >= start_dt)
        except Exception as e_dt:
            logger.error(f"Erro ao parsear start_date: {e_dt}")

    if end_date:
        try:
            end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
            query = query.filter(models.ChatConversation.last_message_at <= end_dt)
        except Exception as e_dt:
            logger.error(f"Erro ao parsear end_date: {e_dt}")

    if tab == "minha":
        query = query.filter(models.ChatConversation.assigned_user_id == current_user.id)
    elif tab == "nao_atribuida":
        query = query.filter(models.ChatConversation.assigned_user_id == None)

    if search:
        search_term = f"%{search}%"
        message_match = (
            db.query(models.ChatMessage.id)
            .filter(
                models.ChatMessage.conversation_id == models.ChatConversation.id,
                models.ChatMessage.content.ilike(search_term)
            )
            .exists()
        )
        query = query.filter(
            models.ChatConversation.contact_name.ilike(search_term) |
            models.ChatConversation.phone.ilike(search_term) |
            message_match
        )

    if has_note:
        query = query.filter(
            models.ChatConversation.private_note.isnot(None),
            models.ChatConversation.private_note != ''
        )

    # Ordenação flexível: conversas fixadas SEMPRE aparecem no topo
    effective_last_at = func.coalesce(models.ChatConversation.last_message_at, models.ChatConversation.created_at)

    if order_by == "oldest":
        query = query.order_by(
            models.ChatConversation.pinned.desc(),
            effective_last_at.asc()
        )
    elif order_by == "name_asc":
        query = query.order_by(
            models.ChatConversation.pinned.desc(),
            func.lower(func.coalesce(models.ChatConversation.contact_name, models.ChatConversation.phone)).asc()
        )
    elif order_by == "name_desc":
        query = query.order_by(
            models.ChatConversation.pinned.desc(),
            func.lower(func.coalesce(models.ChatConversation.contact_name, models.ChatConversation.phone)).desc()
        )
    elif order_by == "messages_desc":
        msg_count_subq = (
            db.query(models.ChatMessage.conversation_id, func.count(models.ChatMessage.id).label("cnt"))
            .group_by(models.ChatMessage.conversation_id)
            .subquery()
        )
        query = query.outerjoin(msg_count_subq, models.ChatConversation.id == msg_count_subq.c.conversation_id).order_by(
            models.ChatConversation.pinned.desc(),
            func.coalesce(msg_count_subq.c.cnt, 0).desc(),
            effective_last_at.desc()
        )
    elif order_by == "messages_asc":
        msg_count_subq = (
            db.query(models.ChatMessage.conversation_id, func.count(models.ChatMessage.id).label("cnt"))
            .group_by(models.ChatMessage.conversation_id)
            .subquery()
        )
        query = query.outerjoin(msg_count_subq, models.ChatConversation.id == msg_count_subq.c.conversation_id).order_by(
            models.ChatConversation.pinned.desc(),
            func.coalesce(msg_count_subq.c.cnt, 0).asc(),
            effective_last_at.asc()
        )
    elif order_by == "unread_desc":
        query = query.order_by(
            models.ChatConversation.pinned.desc(),
            models.ChatConversation.unread_count.desc(),
            effective_last_at.desc()
        )
    else:  # default "recent"
        query = query.order_by(
            models.ChatConversation.pinned.desc(),
            effective_last_at.desc()
        )

    conversations = query.all()
    
    if label:
        clean_label = label.strip().lower()
        conversations = [
            c for c in conversations
            if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
        ]

    now = datetime.utcnow()
    blocked_entries = db.query(models.BlockedContact.phone).filter(
        models.BlockedContact.client_id == client_id
    ).all()
    blocked_suffixes = {b.phone[-8:] for b in blocked_entries if b.phone and len(b.phone) >= 8}

    resting_entries = db.query(models.RestingContact.phone, models.RestingContact.expires_at).filter(
        models.RestingContact.client_id == client_id,
        models.RestingContact.expires_at > now
    ).all()
    resting_map = {r.phone[-8:]: r.expires_at for r in resting_entries if r.phone and len(r.phone) >= 8}

    def get_block_info(phone: Optional[str]):
        digits = "".join(filter(str.isdigit, phone or ""))
        if len(digits) < 8:
            return None, None
        suffix = digits[-8:]
        if suffix in blocked_suffixes:
            return "blocked", None
        if suffix in resting_map:
            return "resting", resting_map[suffix]
        return None, None

    active_triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended'])
    ).all()
    active_funnels_map = {}
    for t in active_triggers:
        if t.funnel_id and t.contact_phone:
            digits = "".join(filter(str.isdigit, t.contact_phone))
            if len(digits) >= 8:
                funnel = db.query(models.Funnel).filter(models.Funnel.id == t.funnel_id).first()
                if funnel:
                    active_funnels_map[digits[-8:]] = {
                        "id": funnel.id,
                        "trigger_id": t.id,
                        "name": funnel.name,
                        "status": t.status
                    }

    result = []
    for c in conversations:
        block_type, resting_until = get_block_info(c.phone)

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
        query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)

        tab = payload.get("tab", "todos")
        status = payload.get("status", "open")
        search = payload.get("search")
        label = payload.get("label")
        block_status = payload.get("block_status")
        has_note = payload.get("has_note")
        start_date = payload.get("start_date")
        end_date = payload.get("end_date")
        unread_only = payload.get("unread_only")
        window_open_only = payload.get("window_open_only")
        has_replied = payload.get("has_replied")

        if status != "all":
            query = query.filter(models.ChatConversation.status == status)

        if unread_only:
            query = query.filter(models.ChatConversation.unread_count > 0)

        if window_open_only:
            limit_time = datetime.utcnow() - timedelta(hours=24)
            query = query.filter(models.ChatConversation.last_contact_message_at >= limit_time)

        if has_replied:
            query = query.filter(models.ChatConversation.last_contact_message_at.isnot(None))

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(models.ChatConversation.last_message_at >= start_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear start_date em bulk_archive: {e_dt}")

        if end_date:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
                query = query.filter(models.ChatConversation.last_message_at <= end_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear end_date em bulk_archive: {e_dt}")

        if tab == "minha":
            query = query.filter(models.ChatConversation.assigned_user_id == current_user.id)
        elif tab == "nao_atribuida":
            query = query.filter(models.ChatConversation.assigned_user_id == None)

        if search:
            search_term = f"%{search}%"
            message_match = (
                db.query(models.ChatMessage.id)
                .filter(
                    models.ChatMessage.conversation_id == models.ChatConversation.id,
                    models.ChatMessage.content.ilike(search_term)
                )
                .exists()
            )
            query = query.filter(
                models.ChatConversation.contact_name.ilike(search_term) |
                models.ChatConversation.phone.ilike(search_term) |
                message_match
            )

        if has_note:
            query = query.filter(
                models.ChatConversation.private_note.isnot(None),
                models.ChatConversation.private_note != ''
            )

        convos = query.all()

        if label:
            clean_label = label.strip().lower()
            convos = [
                c for c in convos
                if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
            ]
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
    from config_loader import get_setting
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


@router.delete("/chat/conversations/{conversation_id}/messages", summary="Limpar mensagens de uma conversa")
async def clear_conversation_messages(
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

    # Deleta fisicamente todas as mensagens associadas a esta conversa
    deleted_count = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).delete(synchronize_session=False)

    # Zera última mensagem e contador de não lidas na conversa
    convo.last_message_content = None
    convo.unread_count = 0
    db.commit()

    logger.info(f"🧹 [CLEAR_CONVO_MESSAGES] Conversa #{conversation_id} teve {deleted_count} mensagens limpas pelo usuário #{current_user.id}.")
    return {
        "status": "ok",
        "conversation_id": conversation_id,
        "deleted_count": deleted_count,
        "message": "Histórico de mensagens limpo com sucesso."
    }


@router.delete("/chat/conversations/{conversation_id}", summary="Deletar conversa")
async def delete_conversation(
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
    db.delete(convo)
    db.commit()
    return {"status": "ok", "deleted_id": conversation_id}


@router.delete("/chat/conversations", summary="Deletar múltiplas conversas")
async def delete_conversations_bulk(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    select_all_pages = payload.get("select_all_pages", False)
    if select_all_pages:
        query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)
        
        tab = payload.get("tab", "todos")
        status = payload.get("status", "open")
        search = payload.get("search")
        label = payload.get("label")
        block_status = payload.get("block_status")
        has_note = payload.get("has_note")
        start_date = payload.get("start_date")
        end_date = payload.get("end_date")
        unread_only = payload.get("unread_only")
        window_open_only = payload.get("window_open_only")
        has_replied = payload.get("has_replied")

        if status != "all":
            query = query.filter(models.ChatConversation.status == status)

        if unread_only:
            query = query.filter(models.ChatConversation.unread_count > 0)

        if window_open_only:
            limit_time = datetime.utcnow() - timedelta(hours=24)
            query = query.filter(models.ChatConversation.last_contact_message_at >= limit_time)

        if has_replied:
            query = query.filter(models.ChatConversation.last_contact_message_at.isnot(None))

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(models.ChatConversation.last_message_at >= start_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear start_date na exclusão bulk: {e_dt}")

        if end_date:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
                query = query.filter(models.ChatConversation.last_message_at <= end_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear end_date na exclusão bulk: {e_dt}")

        if tab == "minha":
            query = query.filter(models.ChatConversation.assigned_user_id == current_user.id)
        elif tab == "nao_atribuida":
            query = query.filter(models.ChatConversation.assigned_user_id == None)

        if search:
            search_term = f"%{search}%"
            message_match = (
                db.query(models.ChatMessage.id)
                .filter(
                    models.ChatMessage.conversation_id == models.ChatConversation.id,
                    models.ChatMessage.content.ilike(search_term)
                )
                .exists()
            )
            query = query.filter(
                models.ChatConversation.contact_name.ilike(search_term) |
                models.ChatConversation.phone.ilike(search_term) |
                message_match
            )

        if has_note:
            query = query.filter(
                models.ChatConversation.private_note.isnot(None),
                models.ChatConversation.private_note != ''
            )

        conversations = query.all()

        if label:
            clean_label = label.strip().lower()
            conversations = [
                c for c in conversations
                if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
            ]

        if block_status:
            now = datetime.utcnow()
            blocked_entries = db.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id == client_id
            ).all()
            blocked_suffixes = {b.phone[-8:] for b in blocked_entries if b.phone and len(b.phone) >= 8}

            resting_entries = db.query(models.RestingContact.phone, models.RestingContact.expires_at).filter(
                models.RestingContact.client_id == client_id,
                models.RestingContact.expires_at > now
            ).all()
            resting_map = {r.phone[-8:]: r.expires_at for r in resting_entries if r.phone and len(r.phone) >= 8}

            def get_block_info(phone: Optional[str]):
                digits = "".join(filter(str.isdigit, phone or ""))
                if len(digits) < 8:
                    return None, None
                suffix = digits[-8:]
                if suffix in blocked_suffixes:
                    return "blocked", None
                if suffix in resting_map:
                    return "resting", resting_map[suffix]
                return None, None

            filtered_conversations = []
            for c in conversations:
                block_type, _ = get_block_info(c.phone)
                if block_type == block_status:
                    filtered_conversations.append(c)
            conversations = filtered_conversations

        deleted = conversations
    else:
        ids = payload.get("ids", [])
        if not ids:
            raise HTTPException(status_code=400, detail="Nenhum ID fornecido.")
        deleted = db.query(models.ChatConversation).filter(
            models.ChatConversation.id.in_(ids),
            models.ChatConversation.client_id == client_id
        ).all()

    count = len(deleted)
    for convo in deleted:
        db.delete(convo)
    db.commit()
    return {"status": "ok", "deleted_count": count}


@router.post("/chat/seed-conversations")
async def seed_conversations(
    count: int = Query(5000, ge=1, le=10000),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    first_names = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana", "Lucas", "Mariana", "Natan", "Patricia", "Rafael", "Sophia", "Thiago", "Vanessa", "Wagner", "Yasmin"]
    last_names = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"]
    sample_messages = [
        "Olá, gostaria de saber mais informações sobre os cursos de astrologia.",
        "Boa tarde! Como funciona a consulta individual com o Crassos?",
        "Oi! Recebi o convite para o evento de quinta-feira, como faço para confirmar?",
        "Tudo bem? Qual é o valor do mapa astral completo?",
        "Olá! Vocês têm atendimento nos finais de semana?",
        "Oi, preciso de ajuda com o meu acesso à plataforma de membros.",
        "Boa tarde! O evento Astrowake é gratuito mesmo?",
        "Olá, gostaria de agendar uma consulta para a próxima semana.",
        "Oi! Consegue me mandar o link do grupo VIP?",
        "Boa tarde, tentei fazer o pagamento mas deu erro na página."
    ]

    start_phone_base = 558590000000
    now = datetime.now(timezone.utc)

    max_id = db.query(func.max(models.ChatConversation.id)).scalar() or 0
    phone_offset = max_id + random.randint(1000, 9999)

    messages_to_create = []

    for i in range(count):
        fn = first_names[i % len(first_names)]
        ln = last_names[(i // len(first_names)) % len(last_names)]
        name = f"{fn} {ln} #{i+1}"
        phone = str(start_phone_base + phone_offset + i)
        msg_text = sample_messages[i % len(sample_messages)]
        msg_time = now - timedelta(minutes=random.randint(1, 10000))

        convo = models.ChatConversation(
            client_id=client_id,
            phone=phone,
            contact_name=name,
            last_message_content=msg_text,
            last_message_at=msg_time,
            status="open",
            unread_count=random.choice([0, 1, 2]),
            last_contact_message_at=msg_time,
            created_at=msg_time
        )
        db.add(convo)
        db.flush()

        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="contact",
            content=msg_text,
            message_type="text",
            timestamp=msg_time,
            status="delivered"
        )
        messages_to_create.append(msg)

        if len(messages_to_create) >= 1000:
            db.add_all(messages_to_create)
            db.commit()
            messages_to_create = []

    if messages_to_create:
        db.add_all(messages_to_create)
        db.commit()

    logger.info(f"✅ [SEED_CONVERSATIONS] {count} conversas geradas com sucesso para o Cliente #{client_id}.")

    return {
        "status": "success",
        "message": f"{count} conversas geradas com sucesso para o cliente ativo.",
        "total_created": count
    }

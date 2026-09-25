from datetime import datetime, timezone, timedelta, time
from typing import Optional, Tuple, Dict, Any, List, Set
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

import models
from core.logger import setup_logger

logger = setup_logger("ChatRouter.ConversationFilters")


def build_conversation_filter_query(
    db: Session,
    client_id: int,
    current_user: Optional[models.User] = None,
    tab: str = "todos",
    status: str = "open",
    unread_only: Optional[bool] = None,
    window_open_only: Optional[bool] = None,
    template_sent_24h_only: Optional[bool] = None,
    urgent_only: Optional[bool] = None,
    has_replied: Optional[bool] = None,
    has_active_funnel: Optional[bool] = None,
    last_message_read_only: Optional[bool] = None,
    last_message_unread_only: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    has_note: Optional[bool] = None,
    order_by: Optional[str] = None,
    excluded_ids: Optional[List[int]] = None
):
    """
    Constrói a query SQL padrão de conversas aplicando todos os filtros do dashboard e de ações em lote.
    """
    query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)

    if excluded_ids:
        query = query.filter(~models.ChatConversation.id.in_(excluded_ids))

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

    if last_message_read_only:
        convo_ids_subq = db.query(models.ChatConversation.id).filter(models.ChatConversation.client_id == client_id)
        subq = db.query(func.max(models.ChatMessage.id)).filter(
            models.ChatMessage.conversation_id.in_(convo_ids_subq)
        ).group_by(models.ChatMessage.conversation_id)

        read_convo_ids = [
            r[0] for r in db.query(models.ChatMessage.conversation_id).filter(
                models.ChatMessage.id.in_(subq),
                models.ChatMessage.sender_type == 'user',
                models.ChatMessage.status == 'read'
            ).all() if r[0]
        ]
        if read_convo_ids:
            query = query.filter(models.ChatConversation.id.in_(read_convo_ids))
        else:
            query = query.filter(models.ChatConversation.id == -1)

    if last_message_unread_only:
        convo_ids_subq = db.query(models.ChatConversation.id).filter(models.ChatConversation.client_id == client_id)
        subq = db.query(func.max(models.ChatMessage.id)).filter(
            models.ChatMessage.conversation_id.in_(convo_ids_subq)
        ).group_by(models.ChatMessage.conversation_id)

        unread_convo_ids = [
            r[0] for r in db.query(models.ChatMessage.conversation_id).filter(
                models.ChatMessage.id.in_(subq),
                models.ChatMessage.sender_type == 'user',
                or_(models.ChatMessage.status != 'read', models.ChatMessage.status == None)
            ).all() if r[0]
        ]
        if unread_convo_ids:
            query = query.filter(models.ChatConversation.id.in_(unread_convo_ids))
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

    if current_user:
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

    if order_by:
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

    return query


def get_blocked_and_resting_data(db: Session, client_id: int) -> Tuple[Set[str], Dict[str, datetime]]:
    """
    Retorna os sufixos bloqueados e o mapa de descanso ativo para o cliente.
    """
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

    return blocked_suffixes, resting_map


def get_block_info(
    phone: Optional[str],
    blocked_suffixes: Set[str],
    resting_map: Dict[str, datetime]
) -> Tuple[Optional[str], Optional[datetime]]:
    """
    Identifica se um número de telefone está bloqueado ou em descanso.
    """
    digits = "".join(filter(str.isdigit, phone or ""))
    if len(digits) < 8:
        return None, None
    suffix = digits[-8:]
    if suffix in blocked_suffixes:
        return "blocked", None
    if suffix in resting_map:
        return "resting", resting_map[suffix]
    return None, None


def get_active_funnels_map(db: Session, client_id: int) -> Dict[str, Dict[str, Any]]:
    """
    Retorna o mapa de funis ativos vinculados ao sufixo de telefone dos contatos.
    Suporta tanto disparos individuais quanto em massa (bulk).
    """
    active_triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended'])
    ).all()

    active_funnels_map = {}
    for t in active_triggers:
        if not t.funnel_id:
            continue
        funnel = db.query(models.Funnel).filter(models.Funnel.id == t.funnel_id).first()
        if not funnel:
            continue

        funnel_info = {
            "id": funnel.id,
            "trigger_id": t.id,
            "name": funnel.name,
            "status": t.status
        }

        # 1. Telefone direto do trigger (disparo individual ou child trigger)
        if t.contact_phone:
            digits = "".join(filter(str.isdigit, t.contact_phone))
            if len(digits) >= 8:
                active_funnels_map[digits[-8:]] = funnel_info

        # 2. Lista de contatos de disparo em massa (bulk trigger pai)
        if t.is_bulk and t.contacts_list and isinstance(t.contacts_list, list):
            for c in t.contacts_list:
                c_phone = None
                if isinstance(c, dict):
                    c_phone = c.get("phone") or c.get("telefone")
                    if not c_phone and isinstance(c.get("meta"), dict):
                        c_phone = c["meta"].get("sender", {}).get("phone_number")
                elif isinstance(c, str):
                    c_phone = c

                if c_phone:
                    c_digits = "".join(filter(str.isdigit, str(c_phone)))
                    if len(c_digits) >= 8:
                        active_funnels_map[c_digits[-8:]] = funnel_info

    return active_funnels_map


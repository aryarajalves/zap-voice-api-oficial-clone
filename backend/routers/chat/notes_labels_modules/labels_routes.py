from datetime import datetime, timezone, timedelta, time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.orm.attributes import flag_modified

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from ..common import get_client_id, LabelCreateRequest

logger = setup_logger("ChatRouter.Labels")

router = APIRouter()


# As rotas HTTP /chat/labels são registradas exclusivamente por routers.chat_labels
# Mantemos as funções list_custom_labels e create_custom_label para retrocompatibilidade de importações.
async def list_custom_labels(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from routers.chat_labels import list_chat_labels
    return await list_chat_labels(client_id=client_id, db=db)


async def create_custom_label(
    payload: LabelCreateRequest,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from routers.chat_labels import create_chat_label, ChatLabelCreate
    label_in = ChatLabelCreate(name=payload.name, color=payload.color or "#3B82F6")
    res = await create_chat_label(payload=label_in, client_id=client_id, db=db, current_user=current_user)
    return {"id": res.id, "name": res.name, "color": res.color, "created": True}


@router.post("/chat/conversations/{conversation_id}/labels")
async def update_conversation_labels(
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

    labels = payload.get("labels", [])
    if not isinstance(labels, list):
        raise HTTPException(status_code=400, detail="Etiquetas devem ser enviadas em formato de lista.")

    old_labels = convo.labels or []
    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    if human_label:
        clean_human_label = human_label.lower()
        has_human_label = clean_human_label in [l.lower() for l in labels]
        
        if has_human_label and not convo.human_handover_at:
            convo.human_handover_at = datetime.now(timezone.utc)
        elif not has_human_label and convo.human_handover_at:
            convo.human_handover_at = None

    old_labels_lower = [l.lower() for l in old_labels]
    new_labels_lower = [l.lower() for l in labels]

    added = [l for l in labels if l.lower() not in old_labels_lower]
    removed = [l for l in old_labels if l.lower() not in new_labels_lower]
    
    events = []
    if added:
        events.append(f"adicionou marcador(es): {', '.join(added)}")
    if removed:
        events.append(f"removeu marcador(es): {', '.join(removed)}")
        
    if events:
        event_text = f"O atendente {current_user.full_name or current_user.email} " + " e ".join(events)
        system_msg = models.ChatMessage(
            conversation_id=conversation_id,
            sender_type="system",
            message_type="text",
            content=event_text,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(system_msg)

    unique_labels = []
    seen_lower = set()
    for l in labels:
        if l.lower() not in seen_lower:
            seen_lower.add(l.lower())
            unique_labels.append(l)

    convo.labels = unique_labels
    db.commit()
    return {"status": "ok", "labels": convo.labels, "human_handover_at": convo.human_handover_at.isoformat() if convo.human_handover_at else None}


@router.post("/chat/conversations/bulk-tag", summary="Etiquetar conversas em massa")
async def bulk_tag_conversations(
    payload: dict = Body(...),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    labels_to_add = payload.get("labels", [])
    if isinstance(labels_to_add, str):
        labels_to_add = [labels_to_add]
    labels_to_add = [l.strip() for l in labels_to_add if isinstance(l, str) and l.strip()]

    if not labels_to_add:
        raise HTTPException(status_code=400, detail="Forneça ao menos uma etiqueta para aplicar.")

    select_all_pages = payload.get("select_all_pages", False)
    ids = payload.get("ids", [])

    if not select_all_pages and not ids:
        raise HTTPException(status_code=400, detail="Nenhuma conversa selecionada para etiquetar.")

    if select_all_pages:
        query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)
        
        tab = payload.get("tab", "todos")
        status = payload.get("status", "open")
        search = payload.get("search")
        label = payload.get("label")
        has_note = payload.get("has_note")
        start_date = payload.get("start_date")
        end_date = payload.get("end_date")
        unread_only = payload.get("unread_only")
        window_open_only = payload.get("window_open_only")
        template_sent_24h_only = payload.get("template_sent_24h_only")
        has_replied = payload.get("has_replied")

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

        if has_replied:
            query = query.filter(models.ChatConversation.last_contact_message_at.isnot(None))

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(models.ChatConversation.last_message_at >= start_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear start_date na etiquetagem bulk: {e_dt}")

        if end_date:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
                query = query.filter(models.ChatConversation.last_message_at <= end_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear end_date na etiquetagem bulk: {e_dt}")

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

        from services.chat_label_service import filter_conversations_by_labels
        conversations = filter_conversations_by_labels(
            conversations=conversations,
            label=label,
            labels=payload.get("labels"),
            include_labels=payload.get("include_labels"),
            label_mode=payload.get("label_mode", "has"),
            label_op=payload.get("label_op", "or"),
            exclude_labels=payload.get("exclude_labels"),
            exclude_label_op=payload.get("exclude_label_op", "or")
        )
    else:
        conversations = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_id,
            models.ChatConversation.id.in_(ids)
        ).all()

    target = payload.get("target", "both")
    count_updated = 0
    convo_phone_set = set()

    # Atualiza as etiquetas das conversas (Chat) se target for 'chat' ou 'both'
    if target in ("chat", "both"):
        for convo in conversations:
            current_labels = convo.labels if isinstance(convo.labels, list) else []
            new_labels = list(current_labels)
            updated_this = False
            for lbl in labels_to_add:
                if lbl.lower() not in [x.lower() for x in new_labels]:
                    new_labels.append(lbl)
                    updated_this = True
            if updated_this:
                convo.labels = new_labels
                flag_modified(convo, "labels")
                count_updated += 1

    # Atualiza as tags dos contatos (Aba de Contatos / Leads) se target for 'contacts', 'contatos' ou 'both'
    if target in ("contacts", "contatos", "both"):
        for convo in conversations:
            if convo.phone:
                cp = str(convo.phone).replace('+', '').strip()
                if cp:
                    convo_phone_set.add(cp)
                    convo_phone_set.add(f"+{cp}")

        leads_updated_count = 0
        if convo_phone_set:
            all_leads = db.query(models.WebhookLead).filter(
                models.WebhookLead.client_id == client_id,
                models.WebhookLead.phone.in_(list(convo_phone_set))
            ).all()

            leads_by_phone = {}
            for lead in all_leads:
                cp = str(lead.phone).replace('+', '').strip()
                if cp not in leads_by_phone:
                    leads_by_phone[cp] = []
                leads_by_phone[cp].append(lead)

            existing_lead_phones = set(leads_by_phone.keys())

            for lead in all_leads:
                existing_tags = [t.strip() for t in (lead.tags or "").split(",") if t.strip()]
                lead_updated = False
                for lbl in labels_to_add:
                    if lbl.lower() not in [t.lower() for t in existing_tags]:
                        existing_tags.append(lbl)
                        lead_updated = True
                if lead_updated:
                    lead.tags = ", ".join(existing_tags)
                    flag_modified(lead, "tags")
                    leads_updated_count += 1

            new_leads = []
            for convo in conversations:
                if convo.phone:
                    cp = str(convo.phone).replace('+', '').strip()
                    if cp and cp not in existing_lead_phones:
                        existing_lead_phones.add(cp)
                        new_leads.append(models.WebhookLead(
                            client_id=client_id,
                            phone=cp,
                            name=convo.contact_name or cp,
                            tags=", ".join(labels_to_add),
                            platform="Chatwoot",
                            created_at=datetime.utcnow()
                        ))
                        leads_updated_count += 1
            if new_leads:
                db.add_all(new_leads)

        if target in ("contacts", "contatos"):
            count_updated = leads_updated_count

    db.commit()
    return {"status": "ok", "updated_count": count_updated, "target": target}

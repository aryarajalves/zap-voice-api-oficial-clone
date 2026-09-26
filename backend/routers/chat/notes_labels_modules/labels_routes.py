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

    remove_labels = payload.get("remove_labels", [])
    if isinstance(remove_labels, str):
        remove_labels = [remove_labels]
    remove_labels = [l.strip() for l in remove_labels if isinstance(l, str) and l.strip()]

    mode = payload.get("mode", "add")  # "add" | "sync"

    if not labels_to_add and not remove_labels and mode != "sync":
        raise HTTPException(status_code=400, detail="Forneça ao menos uma etiqueta para aplicar ou remover.")

    select_all_pages = payload.get("select_all_pages", False)
    ids = payload.get("ids", [])
    excluded_ids = payload.get("excluded_ids", [])

    if not select_all_pages and not ids:
        raise HTTPException(status_code=400, detail="Nenhuma conversa selecionada para etiquetar.")

    if select_all_pages:
        from ..conversation_modules.conversation_filter_helpers import (
            build_conversation_filter_query,
            get_blocked_and_resting_data,
            get_block_info,
        )

        query = build_conversation_filter_query(
            db=db,
            client_id=client_id,
            current_user=current_user,
            tab=payload.get("tab", "todos"),
            status=payload.get("status", "open"),
            unread_only=payload.get("unread_only"),
            window_open_only=payload.get("window_open_only"),
            template_sent_24h_only=payload.get("template_sent_24h_only"),
            urgent_only=payload.get("urgent_only"),
            has_replied=payload.get("has_replied"),
            has_active_funnel=payload.get("has_active_funnel"),
            start_date=payload.get("start_date"),
            end_date=payload.get("end_date"),
            search=payload.get("search"),
            has_note=payload.get("has_note"),
            excluded_ids=excluded_ids
        )

        conversations = query.all()

        filter_label = payload.get("filter_label") or payload.get("label")
        filter_labels = payload.get("filter_labels")
        include_labels = payload.get("include_labels")
        exclude_labels = payload.get("exclude_labels")
        block_status = payload.get("block_status")

        if filter_label or filter_labels or include_labels or exclude_labels:
            from services.chat_label_service import filter_conversations_by_labels
            conversations = filter_conversations_by_labels(
                conversations=conversations,
                label=filter_label,
                labels=filter_labels,
                include_labels=include_labels,
                label_mode=payload.get("label_mode", "has"),
                label_op=payload.get("label_op", "or"),
                exclude_labels=exclude_labels,
                exclude_label_op=payload.get("exclude_label_op", "or")
            )

        if block_status:
            blocked_suffixes, resting_map = get_blocked_and_resting_data(db, client_id)
            if block_status in ('unblocked', 'not_blocked'):
                conversations = [
                    c for c in conversations
                    if get_block_info(c.phone, blocked_suffixes, resting_map)[0] != 'blocked'
                ]
            else:
                conversations = [
                    c for c in conversations
                    if get_block_info(c.phone, blocked_suffixes, resting_map)[0] == block_status
                ]
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
        user_name = current_user.full_name or current_user.email or "Atendente"
        for convo in conversations:
            current_labels = convo.labels if isinstance(convo.labels, list) else []
            updated_this = False
            added_for_convo = []
            removed_for_convo = []

            if mode == "sync":
                new_labels_lower = [l.lower() for l in labels_to_add]
                old_labels_lower = [l.lower() for l in current_labels]
                added_for_convo = [l for l in labels_to_add if l.lower() not in old_labels_lower]
                removed_for_convo = [l for l in current_labels if l.lower() not in new_labels_lower]
                if added_for_convo or removed_for_convo:
                    convo.labels = list(labels_to_add)
                    flag_modified(convo, "labels")
                    updated_this = True
            else:
                new_labels = list(current_labels)
                if remove_labels:
                    rem_lower = [x.lower() for x in remove_labels]
                    for x in current_labels:
                        if x.lower() in rem_lower:
                            removed_for_convo.append(x)
                    if removed_for_convo:
                        new_labels = [x for x in new_labels if x.lower() not in rem_lower]
                        updated_this = True

                for lbl in labels_to_add:
                    if lbl.lower() not in [x.lower() for x in new_labels]:
                        new_labels.append(lbl)
                        added_for_convo.append(lbl)
                        updated_this = True

                if updated_this:
                    convo.labels = new_labels
                    flag_modified(convo, "labels")

            if updated_this:
                count_updated += 1
                events = []
                if added_for_convo:
                    events.append(f"adicionou marcador(es): {', '.join(added_for_convo)}")
                if removed_for_convo:
                    events.append(f"removeu marcador(es): {', '.join(removed_for_convo)}")
                if events:
                    event_text = f"O atendente {user_name} " + " e ".join(events)
                    system_msg = models.ChatMessage(
                        conversation_id=convo.id,
                        sender_type="system",
                        message_type="text",
                        content=event_text,
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(system_msg)

    # Atualiza as tags dos contatos (Aba de Contatos / Leads) se target for 'contacts', 'contatos' ou 'both'
    if target in ("contacts", "contatos", "both"):
        for convo in conversations:
            if convo.phone:
                raw_p = str(convo.phone).strip()
                digits = "".join(filter(str.isdigit, raw_p))
                if digits:
                    convo_phone_set.add(digits)
                    convo_phone_set.add(f"+{digits}")
                    convo_phone_set.add(raw_p)

        leads_updated_count = 0
        if convo_phone_set:
            all_leads = db.query(models.WebhookLead).filter(
                models.WebhookLead.client_id == client_id,
                models.WebhookLead.phone.in_(list(convo_phone_set))
            ).all()

            leads_by_phone = {}
            for lead in all_leads:
                digits = "".join(filter(str.isdigit, str(lead.phone or "")))
                if digits:
                    if digits not in leads_by_phone:
                        leads_by_phone[digits] = []
                    leads_by_phone[digits].append(lead)

            existing_lead_phones = set(leads_by_phone.keys())

            for lead in all_leads:
                existing_tags = [t.strip() for t in (lead.tags or "").split(",") if t.strip()]
                lead_updated = False
                if mode == "sync":
                    new_tags_lower = [l.lower() for l in labels_to_add]
                    filtered_tags = [t for t in existing_tags if t.lower() in new_tags_lower]
                    for lbl in labels_to_add:
                        if lbl.lower() not in [t.lower() for t in filtered_tags]:
                            filtered_tags.append(lbl)
                    if filtered_tags != existing_tags:
                        existing_tags = filtered_tags
                        lead_updated = True
                else:
                    if remove_labels:
                        rem_lower = [x.lower() for x in remove_labels]
                        before_len = len(existing_tags)
                        existing_tags = [t for t in existing_tags if t.lower() not in rem_lower]
                        if len(existing_tags) != before_len:
                            lead_updated = True

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
                    digits = "".join(filter(str.isdigit, str(convo.phone)))
                    if digits and digits not in existing_lead_phones:
                        existing_lead_phones.add(digits)
                        new_leads.append(models.WebhookLead(
                            client_id=client_id,
                            phone=digits,
                            name=convo.contact_name or digits,
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

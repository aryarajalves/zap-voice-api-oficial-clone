import httpx
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.orm.attributes import flag_modified

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from .common import get_client_id, LabelCreateRequest

logger = setup_logger("ChatRouter.NotesLabels")

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


@router.get("/chat/labels")
async def list_custom_labels(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    labels = db.query(models.ChatLabel).filter(models.ChatLabel.client_id == client_id).all()
    return [{"id": l.id, "name": l.name, "color": l.color} for l in labels]


@router.post("/chat/labels")
async def create_custom_label(
    payload: LabelCreateRequest,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    clean_name = payload.name.strip()[:20]
    if not clean_name:
        raise HTTPException(status_code=400, detail="Nome da etiqueta é obrigatório.")

    existing = db.query(models.ChatLabel).filter(
        models.ChatLabel.client_id == client_id,
        func.lower(models.ChatLabel.name) == clean_name.lower()
    ).first()

    if existing:
        existing.color = payload.color or existing.color
        db.commit()
        return {"id": existing.id, "name": existing.name, "color": existing.color, "created": False}

    new_label = models.ChatLabel(
        client_id=client_id,
        name=clean_name,
        color=payload.color or "#3B82F6"
    )
    db.add(new_label)
    db.commit()
    db.refresh(new_label)
    logger.info(f"🏷️ [CREATE_LABEL] Nova etiqueta criada para Client #{client_id}: '{clean_name}' ({payload.color})")
    return {"id": new_label.id, "name": new_label.name, "color": new_label.color, "created": True}


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

        if label:
            clean_label = label.strip().lower()
            conversations = [
                c for c in conversations
                if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
            ]
    else:
        conversations = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_id,
            models.ChatConversation.id.in_(ids)
        ).all()

    count_updated = 0
    convo_phone_set = set()

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
        if convo.phone:
            cp = str(convo.phone).replace('+', '').strip()
            if cp:
                convo_phone_set.add(cp)
                convo_phone_set.add(f"+{cp}")

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
        if new_leads:
            db.add_all(new_leads)

    db.commit()
    return {"status": "ok", "updated_count": count_updated}


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


@router.get("/chat/ai-config")
async def get_ai_config(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
):
    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    return {
        "openai_configured": bool(openai_key and openai_key.strip())
    }


@router.post("/chat/conversations/{conversation_id}/analyze-doubts")
async def analyze_conversation_doubts(
    conversation_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    if not openai_key or not openai_key.strip():
        raise HTTPException(status_code=400, detail="Chave OPENAI_API_KEY não configurada no projeto.")

    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).order_by(models.ChatMessage.timestamp.asc()).all()

    if not messages:
        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "has_unanswered_doubts": False,
            "summary": "Nenhuma mensagem encontrada nesta conversa.",
            "unanswered_doubts": [],
            "raw_report": "Nenhuma dúvida não respondida encontrada nesta conversa."
        }

    formatted_transcript = []
    for m in messages:
        sender = "👤 Cliente" if m.sender_type == "contact" else "🤖 Agente/Bot"
        formatted_transcript.append(f"{sender}: {m.content or ''}")

    transcript_text = "\n".join(formatted_transcript)
    openai_model = get_setting("OPENAI_API_MODEL", "gpt-4o-mini", client_id=client_id)
    system_prompt = (
        "Você é um especialista em Análise de Qualidade de Atendimento ao Cliente e Inteligência Artificial. "
        "Sua missão é ler o histórico de conversa entre o Cliente e o Agente/Robô e identificar as principais dúvidas, "
        "perguntas, problemas ou objeções do cliente que o agente/robô NÃO SOUBE RESPONDER, deu respostas genéricas/evasivas "
        "ou simplesmente ignorou.\n\n"
        "Regras:\n"
        "1. Se TODAS as dúvidas do cliente foram devidamente respondidas com clareza pelo agente, declare explicitamente: "
        "'Nenhuma dúvida não respondida encontrada nesta conversa.'\n"
        "2. Se houver dúvidas não respondidas ou mal respondidas, liste cada uma claramente explicando a dúvida do cliente, "
        "o que o agente respondeu de errado ou se ficou sem resposta, e o que falta treinar no robô.\n"
        "3. Responda em Português do Brasil com formatação limpa e objetiva em tópicos."
    )
    user_prompt = f"Contato: {convo.contact_name or convo.phone} (#{convo.id})\n\nHistórico de Mensagens:\n{transcript_text}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key.strip()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3
                }
            )

        if openai_res.status_code != 200:
            logger.error(f"Erro OpenAI ({openai_res.status_code}): {openai_res.text}")
            raise HTTPException(status_code=500, detail=f"Erro ao chamar API da OpenAI ({openai_res.status_code}).")

        res_data = openai_res.json()
        ai_content = res_data["choices"][0]["message"]["content"].strip()
        has_doubts = "Nenhuma dúvida não respondida" not in ai_content

        return {
            "status": "ok",
            "conversation_id": conversation_id,
            "contact_name": convo.contact_name or convo.phone,
            "phone": convo.phone,
            "has_unanswered_doubts": has_doubts,
            "raw_report": ai_content
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao analisar dúvidas por IA na conversa {conversation_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Falha no serviço de análise por IA: {exc}")


@router.post("/chat/conversations/analyze-doubts-bulk")
async def analyze_conversations_doubts_bulk(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    openai_key = get_setting("OPENAI_API_KEY", "", client_id=client_id)
    if not openai_key or not openai_key.strip():
        raise HTTPException(status_code=400, detail="Chave OPENAI_API_KEY não configurada no projeto.")

    conversation_ids = payload.get("conversation_ids", [])
    if not conversation_ids or not isinstance(conversation_ids, list):
        raise HTTPException(status_code=400, detail="Nenhuma conversa selecionada para análise.")

    convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.id.in_(conversation_ids),
        models.ChatConversation.client_id == client_id
    ).all()

    if not convos:
        raise HTTPException(status_code=404, detail="Nenhuma conversa válida encontrada.")

    combined_transcripts = []
    for c in convos:
        msgs = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == c.id
        ).order_by(models.ChatMessage.timestamp.asc()).all()

        formatted_msgs = []
        for m in msgs:
            sender = "👤 Cliente" if m.sender_type == "contact" else "🤖 Agente/Bot"
            formatted_msgs.append(f"{sender}: {m.content or ''}")

        convo_text = f"--- Conversa #{c.id} ({c.contact_name or c.phone}) ---\n" + "\n".join(formatted_msgs)
        combined_transcripts.append(convo_text)

    all_transcripts_text = "\n\n".join(combined_transcripts)
    openai_model = get_setting("OPENAI_API_MODEL", "gpt-4o-mini", client_id=client_id)
    system_prompt = (
        "Você é um Analista de Inteligência Artificial de Atendimento. "
        "Sua tarefa é analisar o histórico de MÚLTIPLAS conversas entre clientes e o agente/robô de atendimento. "
        "Identifique todas as DÚVIDAS, OBJEÇÕES e PERGUNTAS dos clientes que o agente/robô NÃO SOUBE RESPONDER "
        "ou respondeu de forma incompleta/genérica.\n\n"
        "Gere um relatório consolidado com a seguinte estrutura em Markdown:\n"
        "1. **Resumo Geral de Treinamento**: Visão geral de quantas conversas tinham dúvidas pendentes.\n"
        "2. **Tópicos e Perguntas Mais Frequentes Não Respondidas**: Agrupadas por tema com sugestões de treinamento para o prompt do robô.\n"
        "3. **Detalhamento por Contato**: Lista dos contatos e as dúvidas específicas que ficaram sem resposta em cada conversa (se não houve nenhuma no contato, informe 'Nenhuma dúvida não respondida').\n\n"
        "Se em NENHUMA conversa foram encontradas dúvidas não respondidas, afirme explicitamente: "
        "'Nenhuma dúvida não respondida encontrada nas conversas analisadas.'"
    )
    user_prompt = f"Total de Conversas Analisadas: {len(convos)}\n\nHistóricos de Conversas:\n{all_transcripts_text}"

    try:
        async with httpx.AsyncClient(timeout=90.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key.strip()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3
                }
            )

        if openai_res.status_code != 200:
            logger.error(f"Erro OpenAI Bulk ({openai_res.status_code}): {openai_res.text}")
            raise HTTPException(status_code=500, detail=f"Erro ao chamar API da OpenAI ({openai_res.status_code}).")

        res_data = openai_res.json()
        ai_content = res_data["choices"][0]["message"]["content"].strip()
        has_doubts = "Nenhuma dúvida não respondida encontrada nas conversas analisadas" not in ai_content

        return {
            "status": "ok",
            "total_analyzed": len(convos),
            "conversation_ids": [c.id for c in convos],
            "has_unanswered_doubts": has_doubts,
            "raw_report": ai_content
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao analisar dúvidas por IA em massa: {exc}")
        raise HTTPException(status_code=500, detail=f"Falha no serviço de análise por IA em massa: {exc}")


@router.get("/chat/mention-contacts", summary="Listar contatos e conversas para o menu de menção (@)")
async def list_mention_contacts(
    search: Optional[str] = Query(None, description="Termo para filtrar por nome, telefone ou ID"),
    page: int = Query(1, ge=1, description="Número da página"),
    limit: int = Query(20, ge=1, le=100, description="Quantidade por página"),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna todos os contatos e conversas do cliente logado ordenados alfabeticamente (A-Z)
    com paginação de 20 em 20, normalização de telefones e sem duplicatas.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    from config_loader import get_setting
    from sqlalchemy import text

    def normalize_phone_key(phone_val: str) -> str:
        digits = ''.join(c for c in str(phone_val or '') if c.isdigit())
        if not digits:
            return ""
        if digits.startswith('55'):
            local = digits[2:]
            if len(local) == 10:  # DDD (2) + 8 dígitos -> adiciona o 9º dígito
                return '55' + local[:2] + '9' + local[2:]
            return digits
        elif len(digits) == 10:
            return '55' + digits[:2] + '9' + digits[2:]
        elif len(digits) == 11:
            return '55' + digits
        return digits

    sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "contatos_monitorados", client_id=client_id)
    safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')

    # Mapeamento de conversas existentes por telefone
    convo_map = {}
    existing_convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id
    ).all()

    for c in existing_convos:
        clean_p = (c.phone or '').replace('+', '').strip()
        if clean_p:
            convo_map[clean_p] = c
            norm_p = normalize_phone_key(clean_p)
            if norm_p:
                convo_map[norm_p] = c

    contacts_list = []
    seen_normalized_phones = set()

    # 1. Primeiro prioriza as conversas que já existem no chat
    for c in existing_convos:
        clean_p = (c.phone or '').replace('+', '').strip()
        norm_p = normalize_phone_key(clean_p)
        if norm_p and norm_p not in seen_normalized_phones:
            seen_normalized_phones.add(norm_p)
            contacts_list.append({
                "id": c.id,
                "convo_id": c.id,
                "contact_name": c.contact_name or c.phone or f"Conversa #{c.id}",
                "phone": clean_p or norm_p,
                "has_convo": True
            })

    # 2. Em seguida busca contatos adicionais da tabela sincronizada
    try:
        sql = text(f"SELECT phone, name FROM {safe_table}")
        rows = db.execute(sql).fetchall()
        for r in rows:
            p_raw = str(r[0] or '').replace('+', '').strip()
            name_raw = str(r[1] or '').strip()
            if not p_raw:
                continue

            norm_p = normalize_phone_key(p_raw)
            if not norm_p or norm_p in seen_normalized_phones:
                continue

            seen_normalized_phones.add(norm_p)

            # Se por acaso tiver conversa mapeada
            convo = convo_map.get(norm_p) or convo_map.get(p_raw)
            c_id = convo.id if convo else None
            c_name = (convo.contact_name if convo and convo.contact_name else name_raw) or p_raw

            contacts_list.append({
                "id": c_id or p_raw,
                "convo_id": c_id,
                "contact_name": c_name,
                "phone": p_raw,
                "has_convo": bool(convo)
            })
    except Exception as e:
        logger.warning(f"Tabela {safe_table} não disponível para menções: {e}")

    # Filtragem por busca (nome ou telefone)
    if search and search.strip():
        term = search.strip().lower()
        contacts_list = [
            c for c in contacts_list
            if term in c["contact_name"].lower() or term in c["phone"].lower() or str(c["id"]) == term
        ]

    # Ordenação Alfabética Estrita (A-Z)
    contacts_list.sort(key=lambda x: (x["contact_name"] or "").strip().lower())

    total = len(contacts_list)
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    paginated_items = contacts_list[offset:offset + limit]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }




from datetime import datetime, timezone, timedelta, time
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from .common import get_client_id

logger = setup_logger("ChatRouter.Funnels")

router = APIRouter()


@router.post("/chat/conversations/{conversation_id}/funnel")
async def trigger_funnel_for_conversation(
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

    funnel_id = payload.get("funnel_id")
    if not funnel_id:
        raise HTTPException(status_code=400, detail="Funil não especificado.")

    funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == client_id
    ).first()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")

    existing_active = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.funnel_id == funnel_id,
        models.ScheduledTrigger.contact_phone == convo.phone,
        models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended'])
    ).first()

    if existing_active:
        raise HTTPException(status_code=400, detail="Este funil já está em execução para este contato.")

    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel_id,
        conversation_id=convo.id,
        status='queued',
        is_bulk=False,
        contact_phone=convo.phone,
        contact_name=convo.contact_name or convo.phone,
        skip_block_check=True,
        contacts_list=[{
            "id": str(convo.id),
            "meta": {"sender": {"name": convo.contact_name or convo.phone, "phone_number": convo.phone}}
        }],
        scheduled_time=datetime.now(timezone.utc)
    )

    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    from rabbitmq_client import rabbitmq
    try:
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": funnel_id,
            "contact_phone": convo.phone
        })
        trigger.status = 'processing'
        db.commit()

        # Registrar evento de início do funil com acesso à pipeline na conversa
        try:
            now_dt = datetime.now(timezone.utc)
            chat_msg = models.ChatMessage(
                conversation_id=convo.id,
                sender_type="system",
                message_type="funnel_event",
                content=f"🚀 Funil \"{funnel.name}\" foi iniciado",
                meta_data={
                    "is_funnel_event": True,
                    "funnel_id": funnel.id,
                    "funnel_name": funnel.name,
                    "trigger_id": trigger.id,
                    "status": "started"
                },
                timestamp=now_dt
            )
            db.add(chat_msg)
            db.commit()
            db.refresh(chat_msg)

            payload_ws = {
                "id": chat_msg.id,
                "conversation_id": chat_msg.conversation_id,
                "sender_type": chat_msg.sender_type,
                "message_type": chat_msg.message_type,
                "content": chat_msg.content,
                "meta_data": chat_msg.meta_data,
                "timestamp": chat_msg.timestamp.isoformat() if chat_msg.timestamp else now_dt.isoformat(),
                "client_id": client_id
            }
            await rabbitmq.publish_event("new_message", payload_ws)
        except Exception as e_ev:
            logger.error(f"Erro ao registrar evento de início de funil no chat: {e_ev}")
    except Exception as e:
        logger.error(f"Erro ao publicar execução manual de funil: {e}")
        pass

    return {
        "status": "ok",
        "trigger_id": trigger.id,
        "funnel_id": funnel_id,
        "funnel_name": funnel.name,
        "trigger_status": trigger.status
    }


@router.post("/chat/conversations/{conversation_id}/cancel-funnel")
async def cancel_funnel_for_conversation(
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

    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended'])
    ).all()

    target_trigger = None
    if convo.phone:
        digits = "".join(filter(str.isdigit, convo.phone))
        suffix_key = digits[-8:] if len(digits) >= 8 else None
        for t in triggers:
            if t.conversation_id == convo.id:
                target_trigger = t
                break
            if t.contact_phone:
                t_digits = "".join(filter(str.isdigit, t.contact_phone))
                if len(t_digits) >= 8 and t_digits[-8:] == suffix_key:
                    target_trigger = t
                    break

    if not target_trigger:
        raise HTTPException(status_code=404, detail="Nenhum funil em execução encontrado para este contato.")

    target_trigger.status = 'cancelled'
    db.commit()

    logger.info(f"🛑 [FUNNEL_CANCEL] Trigger {target_trigger.id} cancelado pelo usuário {current_user.email} para o contato {convo.phone}")

    return {
        "message": "Funil cancelado com sucesso!",
        "trigger_id": target_trigger.id
    }


@router.post("/chat/conversations/bulk-funnel", summary="Disparar funil em massa para conversas")
async def trigger_bulk_funnel_for_conversations(
    payload: dict = Body(...),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    funnel_id = payload.get("funnel_id")
    if not funnel_id:
        raise HTTPException(status_code=400, detail="Funil não especificado.")

    funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == client_id
    ).first()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")

    select_all_pages = payload.get("select_all_pages", False)
    ids = payload.get("ids", [])

    if not select_all_pages and not ids:
        raise HTTPException(status_code=400, detail="Nenhuma conversa selecionada para disparar funil.")

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
            limit_time = datetime.now(timezone.utc) - timedelta(hours=24)
            query = query.filter(models.ChatConversation.last_contact_message_at >= limit_time)

        if has_replied:
            query = query.filter(models.ChatConversation.last_contact_message_at.isnot(None))

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(models.ChatConversation.last_message_at >= start_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear start_date em bulk-funnel: {e_dt}")

        if end_date:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
                query = query.filter(models.ChatConversation.last_message_at <= end_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear end_date em bulk-funnel: {e_dt}")

        if tab == "minha":
            query = query.filter(models.ChatConversation.assigned_user_id == current_user.id)
        elif tab == "nao_atribuida":
            query = query.filter(models.ChatConversation.assigned_user_id == None)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    models.ChatConversation.contact_name.ilike(search_term),
                    models.ChatConversation.phone.ilike(search_term)
                )
            )

        if label:
            query = query.filter(models.ChatConversation.labels.contains([label]))

        convos = query.all()
    else:
        convos = db.query(models.ChatConversation).filter(
            models.ChatConversation.id.in_(ids),
            models.ChatConversation.client_id == client_id
        ).all()

    contacts = []
    seen_phones = set()
    for c in convos:
        if not c.phone:
            continue
        digits = "".join(filter(str.isdigit, c.phone))
        if not digits or digits in seen_phones:
            continue
        seen_phones.add(digits)
        contacts.append({
            "id": c.id,
            "conversation_id": c.id,
            "phone": c.phone,
            "name": c.contact_name or c.phone,
            "meta": {
                "sender": {
                    "name": c.contact_name or c.phone,
                    "phone_number": c.phone
                }
            }
        })

    if not contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato com telefone válido encontrado nas conversas selecionadas.")

    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel_id,
        status='queued',
        is_bulk=True,
        contacts_list=contacts,
        total_contacts=len(contacts),
        scheduled_time=datetime.now(timezone.utc),
        delay_seconds=payload.get("delay_seconds", 5),
        concurrency_limit=payload.get("concurrency_limit", 1)
    )
    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    from rabbitmq_client import rabbitmq
    try:
        await rabbitmq.publish("zapvoice_bulk_sends", {
            "trigger_id": trigger.id,
            "funnel_id": funnel_id,
            "contacts": contacts,
            "delay": trigger.delay_seconds,
            "concurrency": trigger.concurrency_limit,
            "type": "funnel_bulk"
        })
        trigger.status = 'processing'
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao publicar disparo de funil em massa: {e}")

    logger.info(f"🚀 [BULK_FUNNEL] Funil {funnel_id} disparado para {len(contacts)} contatos (Trigger #{trigger.id}) pelo usuário {current_user.email}")

    return {
        "status": "ok",
        "trigger_id": trigger.id,
        "funnel_id": funnel_id,
        "funnel_name": funnel.name,
        "total_contacts": len(contacts),
        "message": f"Funil \"{funnel.name}\" iniciado com sucesso para {len(contacts)} contato(s)!"
    }


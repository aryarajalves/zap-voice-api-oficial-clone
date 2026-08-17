from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
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

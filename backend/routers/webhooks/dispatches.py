from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import cast, String, or_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
from core.logger import logger
from rabbitmq_client import rabbitmq

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

META_CATEGORY_PRICES_BRL = {
    "marketing":      0.35,
    "utility":        0.07,
    "service":        0.00,
    "authentication": 0.15,
}

@router.get("/{integration_id}/dispatches", response_model=schemas.TriggerListResponse, summary="Listar histórico de disparos e agendamentos")
def list_dispatches(
    integration_id: str,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    search: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    type_filter: Optional[str] = Query(None),  # free | paid | cancelled
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    query = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == x_client_id,
        cast(models.ScheduledTrigger.integration_id, String) == str(uuid_obj),
    )

    if status:
        query = query.filter(models.ScheduledTrigger.status == status)

    if type_filter == 'cancelled':
        query = query.filter(models.ScheduledTrigger.status == 'cancelled')
    elif type_filter == 'free':
        query = query.filter(models.ScheduledTrigger.status != 'cancelled', models.ScheduledTrigger.sent_as == 'FREE_MESSAGE')
    elif type_filter == 'paid':
        query = query.filter(models.ScheduledTrigger.status != 'cancelled', models.ScheduledTrigger.sent_as == 'TEMPLATE')

    if event_type:
        query = query.filter(models.ScheduledTrigger.event_type == event_type)

    if search and search.strip():
        search = search.strip()
        clean_search = "".join(filter(str.isdigit, search))
        search_filters = [
            models.ScheduledTrigger.contact_name.ilike(f"%{search}%"),
            models.ScheduledTrigger.contact_phone.ilike(f"%{search}%")
        ]
        if clean_search and len(clean_search) >= 4:
            search_filters.append(models.ScheduledTrigger.contact_phone.ilike(f"%{clean_search}%"))
        query = query.filter(or_(*search_filters))
    
    BRASILIA_OFFSET = timedelta(hours=3)

    if start_date:
        try:
            if "T" in start_date:
                start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                if start_dt.tzinfo is None: start_dt = start_dt.replace(tzinfo=timezone.utc)
            else:
                start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc) + BRASILIA_OFFSET
            query = query.filter(models.ScheduledTrigger.created_at >= start_dt)
        except: pass

    if end_date:
        try:
            if "T" in end_date:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt.tzinfo is None: end_dt = end_dt.replace(tzinfo=timezone.utc)
            else:
                end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) + BRASILIA_OFFSET
            query = query.filter(models.ScheduledTrigger.created_at <= end_dt)
        except: pass
    
    total = query.count()
    items = query.order_by(models.ScheduledTrigger.created_at.desc()).offset(skip).limit(limit).all()

    backfilled = False
    for trigger in items:
        if trigger.sent_as is None and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            if first_msg.message_type:
                trigger.sent_as = first_msg.message_type
                backfilled = True
    if backfilled:
        db.commit()

    return {"items": items, "total": total}

@router.post("/{integration_id}/backfill-costs", summary="Recalcular custos históricos dos disparos")
def backfill_dispatch_costs(
    integration_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == x_client_id,
        cast(models.ScheduledTrigger.integration_id, String) == str(uuid_obj),
        or_(models.ScheduledTrigger.total_cost == None, models.ScheduledTrigger.total_cost == 0),
        models.ScheduledTrigger.total_sent > 0
    ).options(joinedload(models.ScheduledTrigger.messages)).all()

    mappings = db.query(models.WebhookEventMapping).filter(
        cast(models.WebhookEventMapping.integration_id, String) == str(uuid_obj)
    ).all()
    mapping_costs = {m.event_type: (m.cost_per_message or 0.0) for m in mappings}

    updated = 0
    for trigger in triggers:
        sent_as = trigger.sent_as
        if not sent_as and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            sent_as = first_msg.message_type if first_msg else None

        if sent_as != 'TEMPLATE': continue

        cost_per_msg = 0.0
        for msg in trigger.messages:
            if msg.meta_price_category and msg.meta_price_category in META_CATEGORY_PRICES_BRL:
                cost_per_msg = META_CATEGORY_PRICES_BRL[msg.meta_price_category]
                break

        if cost_per_msg == 0.0 and trigger.event_type in mapping_costs:
            cost_per_msg = mapping_costs[trigger.event_type]

        if cost_per_msg == 0.0:
            cost_per_msg = META_CATEGORY_PRICES_BRL["marketing"]

        new_total = round(cost_per_msg * (trigger.total_delivered or 1), 4)
        trigger.total_cost = new_total
        trigger.cost_per_unit = cost_per_msg
        if trigger.sent_as is None: trigger.sent_as = 'TEMPLATE'
        updated += 1

    db.commit()
    return {"status": "success", "updated": updated, "message": f"{updated} disparo(s) com custo recalculado."}

@router.post("/dispatches/{dispatch_id}/play", summary="Disparar agora um agendamento")
async def play_dispatch(
    dispatch_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == dispatch_id,
        models.ScheduledTrigger.client_id == x_client_id
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    
    trigger.status = "processing"
    trigger.scheduled_time = datetime.now(timezone.utc)
    db.commit()

    await rabbitmq.publish("zapvoice_funnel_executions", {
        "trigger_id": trigger.id,
        "funnel_id": trigger.funnel_id,
        "conversation_id": trigger.conversation_id,
        "contact_phone": trigger.contact_phone
    })

    return {"status": "success", "message": "Disparo enviado para a fila."}

@router.delete("/dispatches/{dispatch_id}", summary="Cancelar/Excluir um agendamento")
def cancel_dispatch(
    dispatch_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == dispatch_id,
        models.ScheduledTrigger.client_id == x_client_id
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    
    db.delete(trigger)
    db.commit()
    return {"status": "success"}

@router.post("/dispatches/bulk-play", summary="Disparar múltiplos agendamentos em massa")
async def bulk_play_dispatches(
    dispatch_ids: List[int],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id.in_(dispatch_ids),
        models.ScheduledTrigger.client_id == x_client_id
    ).all()
    
    count = 0
    for trigger in triggers:
        trigger.status = "processing"
        trigger.scheduled_time = datetime.now(timezone.utc)
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "conversation_id": trigger.conversation_id,
            "contact_phone": trigger.contact_phone
        })
        count += 1
        
    db.commit()
    return {"status": "success", "triggered_count": count}

@router.post("/dispatches/bulk-delete", summary="Excluir múltiplos agendamentos em massa")
async def bulk_delete_dispatches(
    dispatch_ids: List[int],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    valid_ids_query = db.query(models.ScheduledTrigger.id).filter(
        models.ScheduledTrigger.id.in_(dispatch_ids),
        models.ScheduledTrigger.client_id == x_client_id
    )
    valid_ids = [row[0] for row in valid_ids_query.all()]
    
    if not valid_ids:
        return {"status": "success", "deleted_count": 0}

    db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id.in_(valid_ids)).delete(synchronize_session=False)
    deleted_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id.in_(valid_ids)).delete(synchronize_session=False)
    
    db.commit()
    logger.info(f"🗑️ [BULK DELETE] {deleted_count} disparos removidos.")
    
    return {"status": "success", "deleted_count": deleted_count}

@router.get("/record/{record_id}/status", summary="Buscar status detalhado de um disparo")
def get_record_dispatch_status(
    record_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    record = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == uuid_obj,
        models.WebhookHistory.integration_id.in_(
            db.query(models.WebhookIntegration.id).filter(models.WebhookIntegration.client_id == x_client_id)
        )
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.integration_id == uuid_obj
    ).order_by(models.ScheduledTrigger.created_at.desc()).first()

    if not trigger:
        return {"record_status": record.status, "has_trigger": False, "execution_history": [], "status": record.status}

    return {
        "id": trigger.id,
        "status": trigger.status,
        "total_sent": trigger.total_sent,
        "total_delivered": trigger.total_delivered,
        "total_read": trigger.total_read,
        "total_failed": trigger.total_failed,
        "failure_reason": trigger.failure_reason,
        "execution_history": trigger.execution_history or [],
        "scheduled_time": trigger.scheduled_time.isoformat() if trigger.scheduled_time else None,
        "created_at": trigger.created_at.isoformat() if trigger.created_at else None,
        "has_trigger": True
    }

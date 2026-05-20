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
        models.ScheduledTrigger.integration_id == uuid_obj,
        models.ScheduledTrigger.parent_id == None
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
        query = query.filter(models.ScheduledTrigger.event_type.ilike(event_type))

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
        
        # Adicionar contagem de funis filhos
        trigger.child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == trigger.id).count()
        
        # Buscar follow-up filho associado
        followup = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.parent_id == trigger.id,
            models.ScheduledTrigger.is_followup == True
        ).first()
        if followup:
            trigger.followup_status = followup.status
            trigger.followup_scheduled_time = followup.scheduled_time

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
        models.ScheduledTrigger.integration_id == uuid_obj,
        or_(models.ScheduledTrigger.total_cost == None, models.ScheduledTrigger.total_cost == 0),
        models.ScheduledTrigger.total_sent > 0
    ).options(joinedload(models.ScheduledTrigger.messages)).all()

    mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == uuid_obj
    ).all()
    mapping_costs = {m.event_type: (m.cost_per_message or 0.0) for m in mappings}

    updated = 0
    for trigger in triggers:
        sent_as = trigger.sent_as
        if not sent_as and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            sent_as = first_msg.message_type if first_msg else None

        if sent_as != 'TEMPLATE': continue

        cost_per_msg = None
        for msg in trigger.messages:
            if msg.meta_price_category and msg.meta_price_category in META_CATEGORY_PRICES_BRL:
                cost_per_msg = META_CATEGORY_PRICES_BRL[msg.meta_price_category]
                break

        if cost_per_msg is None:
            if trigger.event_type in mapping_costs:
                cost_per_msg = mapping_costs[trigger.event_type]
            else:
                cost_per_msg = META_CATEGORY_PRICES_BRL["marketing"]

        new_total = round(cost_per_msg * (trigger.total_delivered or 1), 4)
        trigger.total_cost = new_total
        trigger.cost_per_unit = cost_per_msg
        if trigger.sent_as is None: trigger.sent_as = 'TEMPLATE'
        updated += 1

    db.commit()
    return {"status": "success", "updated": updated, "message": f"{updated} disparo(s) com custo recalculado."}

@router.post("/{integration_id}/dispatches/{dispatch_id}/play", summary="Disparar agora um agendamento")
async def play_dispatch(
    integration_id: str,
    dispatch_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid integration_id UUID")

    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == dispatch_id,
        models.ScheduledTrigger.client_id == x_client_id,
        models.ScheduledTrigger.integration_id == uuid_obj
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Dispatch not found for this integration")
    
    # Criar um novo registro (Clone) para manter o histórico íntegro
    new_trigger = models.ScheduledTrigger(
        client_id=trigger.client_id,
        funnel_id=trigger.funnel_id,
        contact_phone=trigger.contact_phone,
        contact_name=trigger.contact_name,
        conversation_id=trigger.conversation_id,
        chatwoot_account_id=trigger.chatwoot_account_id,
        chatwoot_contact_id=trigger.chatwoot_contact_id,
        chatwoot_inbox_id=trigger.chatwoot_inbox_id,
        status='processing',
        scheduled_time=datetime.now(timezone.utc),
        template_name=trigger.template_name,
        template_language=trigger.template_language,
        template_components=trigger.template_components,
        private_message=trigger.private_message,
        private_message_delay=trigger.private_message_delay,
        private_message_concurrency=trigger.private_message_concurrency,
        is_bulk=False, # Sempre individual ao disparar pelo histórico de um contato
        event_type=trigger.event_type or 'manual_retry',
        integration_id=trigger.integration_id,
        chatwoot_label=trigger.chatwoot_label,
        is_free_message=trigger.is_free_message,
        parent_id=None # Alterado para aparecer na lista principal como um novo disparo
    )
    
    db.add(new_trigger)
    db.commit()
    db.refresh(new_trigger)

    # Reagendamento de follow-up configurado
    import hashlib
    original_followup = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.parent_id == trigger.id,
        models.ScheduledTrigger.is_followup == True
    ).first()

    mapping = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == trigger.integration_id,
        models.WebhookEventMapping.event_type == trigger.event_type,
        models.WebhookEventMapping.is_active == True
    ).first()

    has_followup_config = False
    if original_followup:
        has_followup_config = True
    elif mapping and getattr(mapping, "followup_active", False) and mapping.followup_template_name:
        has_followup_config = True

    if has_followup_config:
        fu_delay_sec = 1800  # padrão 30 minutos
        if mapping:
            fu_value = getattr(mapping, "followup_delay_value", 0) or 0
            fu_unit = getattr(mapping, "followup_delay_unit", "minutes") or "minutes"
            fu_delay_sec = fu_value * 60
            if fu_unit == "hours":
                fu_delay_sec = fu_value * 3600
        elif original_followup and original_followup.scheduled_time and trigger.scheduled_time:
            t1_naive = original_followup.scheduled_time.replace(tzinfo=None)
            t2_naive = trigger.scheduled_time.replace(tzinfo=None)
            diff = t1_naive - t2_naive
            fu_delay_sec = max(int(diff.total_seconds()), 0)

        fu_scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=fu_delay_sec)
        fu_template_name = mapping.followup_template_name if mapping else (original_followup.template_name if original_followup else None)
        fu_components = original_followup.template_components if original_followup else (mapping.followup_variables_mapping if mapping else None)
        fu_cost = mapping.cost_per_message if mapping else (original_followup.cost_per_unit if original_followup else 0.35)

        if fu_template_name:
            fu_idempotency_key = f"fu_play_{new_trigger.id}_{hashlib.md5(str(fu_scheduled_time).encode()).hexdigest()[:8]}"
            new_followup = models.ScheduledTrigger(
                scheduled_time=fu_scheduled_time,
                status="queued",
                contact_name=new_trigger.contact_name,
                contact_phone=new_trigger.contact_phone,
                template_name=fu_template_name,
                template_components=fu_components,
                template_language=new_trigger.template_language or "pt_BR",
                client_id=new_trigger.client_id,
                product_name=new_trigger.product_name,
                private_message=None,
                publish_external_event=True,
                chatwoot_label=new_trigger.chatwoot_label,
                is_free_message=False,
                cost_per_unit=fu_cost or 0.35,
                sent_as="TEMPLATE",
                event_type=new_trigger.event_type,
                integration_id=new_trigger.integration_id,
                funnel_id=None,
                is_bulk=False,
                is_followup=True,
                parent_id=new_trigger.id,
                idempotency_key=fu_idempotency_key,
                skip_block_check=True
            )
            db.add(new_followup)
            db.commit()
            logger.info(f"⏳ [PLAY-FOLLOWUP] Novo follow-up #{new_followup.id} criado para clone #{new_trigger.id} as {fu_scheduled_time}")

    logger.info(f"📤 [PLAY-CLONE] Novo disparo criado: ID {new_trigger.id} (Original: {trigger.id}) | Phone {new_trigger.contact_phone}")
    await rabbitmq.publish("zapvoice_funnel_executions", {
        "trigger_id": new_trigger.id,
        "funnel_id": new_trigger.funnel_id,
        "conversation_id": new_trigger.conversation_id,
        "contact_phone": new_trigger.contact_phone
    })

    return {"status": "success", "message": "Novo disparo criado e enviado para a fila.", "new_id": new_trigger.id}

@router.delete("/{integration_id}/dispatches/{dispatch_id}", summary="Cancelar/Excluir um agendamento")
def cancel_dispatch(
    integration_id: str,
    dispatch_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid integration_id UUID")

    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == dispatch_id,
        models.ScheduledTrigger.client_id == x_client_id,
        models.ScheduledTrigger.integration_id == uuid_obj
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Dispatch not found for this integration")
    
    db.delete(trigger)
    db.commit()
    return {"status": "success"}

@router.post("/{integration_id}/dispatches/bulk-play", summary="Disparar múltiplos agendamentos em massa")
async def bulk_play_dispatches(
    integration_id: str,
    dispatch_ids: List[int],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid integration_id UUID")

    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id.in_(dispatch_ids),
        models.ScheduledTrigger.client_id == x_client_id,
        models.ScheduledTrigger.integration_id == uuid_obj
    ).all()
    
    count = 0
    import hashlib
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

        # Reagendar ou criar o follow-up
        followup = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.parent_id == trigger.id,
            models.ScheduledTrigger.is_followup == True
        ).first()

        mapping = db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == trigger.integration_id,
            models.WebhookEventMapping.event_type == trigger.event_type,
            models.WebhookEventMapping.is_active == True
        ).first()

        has_followup_config = False
        if followup:
            has_followup_config = True
        elif mapping and getattr(mapping, "followup_active", False) and mapping.followup_template_name:
            has_followup_config = True

        if has_followup_config:
            fu_delay_sec = 1800
            if mapping:
                fu_value = getattr(mapping, "followup_delay_value", 0) or 0
                fu_unit = getattr(mapping, "followup_delay_unit", "minutes") or "minutes"
                fu_delay_sec = fu_value * 60
                if fu_unit == "hours":
                    fu_delay_sec = fu_value * 3600
            elif followup and followup.scheduled_time and trigger.scheduled_time:
                t1_naive = followup.scheduled_time.replace(tzinfo=None)
                t2_naive = trigger.scheduled_time.replace(tzinfo=None)
                diff = t1_naive - t2_naive
                fu_delay_sec = max(int(diff.total_seconds()), 0)

            fu_scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=fu_delay_sec)

            if followup:
                # Atualizar existente
                followup.status = "queued"
                followup.scheduled_time = fu_scheduled_time
                logger.info(f"⏳ [BULK-PLAY-FOLLOWUP] Reagendado follow-up #{followup.id} para trigger #{trigger.id} as {fu_scheduled_time}")
            else:
                # Criar novo
                fu_template_name = mapping.followup_template_name if mapping else None
                fu_components = mapping.followup_variables_mapping if mapping else None
                fu_cost = mapping.cost_per_message if mapping else 0.35
                if fu_template_name:
                    fu_idempotency_key = f"fu_bulk_{trigger.id}_{hashlib.md5(str(fu_scheduled_time).encode()).hexdigest()[:8]}"
                    new_followup = models.ScheduledTrigger(
                        scheduled_time=fu_scheduled_time,
                        status="queued",
                        contact_name=trigger.contact_name,
                        contact_phone=trigger.contact_phone,
                        template_name=fu_template_name,
                        template_components=fu_components,
                        template_language=trigger.template_language or "pt_BR",
                        client_id=trigger.client_id,
                        product_name=trigger.product_name,
                        private_message=None,
                        publish_external_event=True,
                        chatwoot_label=trigger.chatwoot_label,
                        is_free_message=False,
                        cost_per_unit=fu_cost or 0.35,
                        sent_as="TEMPLATE",
                        event_type=trigger.event_type,
                        integration_id=trigger.integration_id,
                        funnel_id=None,
                        is_bulk=False,
                        is_followup=True,
                        parent_id=trigger.id,
                        idempotency_key=fu_idempotency_key,
                        skip_block_check=True
                    )
                    db.add(new_followup)
                    logger.info(f"⏳ [BULK-PLAY-FOLLOWUP] Criado novo follow-up #{new_followup.id} para trigger #{trigger.id} as {fu_scheduled_time}")

    db.commit()
    return {"status": "success", "triggered_count": count}

@router.delete("/{integration_id}/dispatches/bulk-delete", summary="Excluir múltiplos agendamentos em massa")
async def bulk_delete_dispatches(
    integration_id: str,
    request: schemas.BulkDeleteRequest,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dispatch_ids = request.ids
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid integration_id UUID")

    valid_ids_query = db.query(models.ScheduledTrigger.id).filter(
        models.ScheduledTrigger.id.in_(dispatch_ids),
        models.ScheduledTrigger.client_id == x_client_id,
        models.ScheduledTrigger.integration_id == uuid_obj
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

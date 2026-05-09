from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session
from typing import Optional
import models, schemas
from core.deps import get_current_user, get_db
from rabbitmq_client import rabbitmq
from services.triggers_service import (
    reconcile_trigger_stats_logic, 
    cancel_trigger_with_report_logic,
    retry_trigger_logic,
    start_now_trigger_logic
)

router = APIRouter()

@router.post("/{trigger_id}/reconcile", summary="Reconciliar contadores do disparo")
async def reconcile_trigger_stats(
    trigger_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    result = await reconcile_trigger_stats_logic(trigger_id, client_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Disparo não encontrado.")
    
    return {
        "status": "success",
        "message": "Contadores reconciliados com sucesso.",
        "data": result
    }

@router.post("/backfill-sent-as", summary="Preencher sent_as histórico")
def backfill_sent_as(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.sent_as == None
    ).all()

    updated = 0
    for trigger in triggers:
        if trigger.messages:
            from sqlalchemy import func
            first_msg = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == trigger.id).order_by(models.MessageStatus.id).first()
            if first_msg and first_msg.message_type:
                trigger.sent_as = first_msg.message_type
                updated += 1

    db.commit()
    return {"status": "success", "updated": updated}

@router.post("/{trigger_id}/cancel-with-report", summary="Cancelar com Relatório Detalhado")
async def cancel_trigger_with_report(
    trigger_id: int, 
    payload: dict = Body(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    result = await cancel_trigger_with_report_logic(trigger_id, payload, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trigger not found")
    if result == "finished":
        raise HTTPException(status_code=400, detail="Trigger already finished")
    return result

@router.post("/{trigger_id}/cancel", summary="Cancelar Disparo Simples")
async def cancel_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status in ['completed', 'failed', 'cancelled']: return {"message": "Trigger already finished"}
         
    trigger.status = "cancelled"
    db.commit()
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "cancelled", "client_id": current_user.client_id})
    return {"message": "Trigger cancelled successfully"}

@router.post("/{trigger_id}/pause", summary="Pausar Disparo")
async def pause_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status != 'processing': raise HTTPException(status_code=400, detail="Somente disparos em processamento podem ser pausados")
    
    trigger.status = "paused"
    db.commit()
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "paused", "client_id": trigger.client_id})
    return {"message": "Trigger paused"}

@router.post("/{trigger_id}/resume", summary="Retomar Disparo")
async def resume_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status != 'paused': raise HTTPException(status_code=400, detail="Trigger não está pausado")
    
    trigger.status = "processing"
    db.commit()
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "processing", "client_id": trigger.client_id})
    return {"message": "Trigger resumed"}

@router.post("/{trigger_id}/retry", summary="Repetir Disparo")
async def retry_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await retry_trigger_logic(trigger_id, db)
    if result is None: raise HTTPException(status_code=404, detail="Trigger not found")
    if result == "no_failures": raise HTTPException(status_code=404, detail="Nenhuma falha encontrada para repetir")
    return result

@router.post("/{trigger_id}/start-now", summary="Iniciar Disparo Imediatamente")
async def start_now_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await start_now_trigger_logic(trigger_id, db)
    if result is None: raise HTTPException(status_code=404, detail="Trigger not found")
    if result == "already_processing": raise HTTPException(status_code=400, detail="O disparo já está sendo processado.")
    return result

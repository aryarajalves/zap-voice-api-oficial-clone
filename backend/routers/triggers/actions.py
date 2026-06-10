from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid
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
    
    # Adicionar log de execução do nó como cancelado para que a interface de detalhes de contatos mostre corretamente!
    try:
        from core.engine.logging import log_node_execution
        current_node = trigger.current_node_id or 'DELIVERY'
        log_node_execution(db, trigger, node_id=current_node, status="cancelled", details="Disparo cancelado pelo usuário.")
    except Exception as e_log:
        import logging
        logging.getLogger("FastAPI.CancelTrigger").error(f"Erro ao registrar log de cancelamento: {e_log}")

    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "cancelled", "client_id": current_user.client_id})
    return {"message": "Trigger cancelled successfully"}

@router.post("/{trigger_id}/pause", summary="Pausar Disparo")
async def pause_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status != 'processing': raise HTTPException(status_code=400, detail="Somente disparos em processamento podem ser pausados")
    
    from datetime import datetime
    trigger.status = "paused"
    pdata = dict(trigger.processed_data or {})
    pdata["paused_at"] = datetime.utcnow().isoformat()
    trigger.processed_data = pdata
    
    db.commit()
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": "paused", "client_id": trigger.client_id})
    return {"message": "Trigger paused"}

@router.post("/{trigger_id}/resume", summary="Retomar Disparo")
async def resume_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trigger = db.query(models.ScheduledTrigger).get(trigger_id)
    if not trigger: raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.status != 'paused': raise HTTPException(status_code=400, detail="Trigger não está pausado")
    
    from datetime import datetime
    trigger.status = "processing"
    pdata = dict(trigger.processed_data or {})
    paused_at_str = pdata.pop("paused_at", None)
    if paused_at_str:
        try:
            # Remover o sufixo Z se houver, convertendo para ISO format padrão
            if paused_at_str.endswith('Z'):
                paused_at_str = paused_at_str[:-1]
            paused_at = datetime.fromisoformat(paused_at_str)
            diff = (datetime.utcnow() - paused_at).total_seconds()
            pdata["paused_duration"] = pdata.get("paused_duration", 0) + int(diff)
        except Exception as e:
            import logging
            logging.getLogger("FastAPI.Resume").error(f"Erro ao calcular duracao da pausa: {e}")
    trigger.processed_data = pdata
    
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

class ManualInteractionPayload(BaseModel):
    phones: List[str] = Field(..., description="Lista de telefones para ativar a interação")

@router.post("/{trigger_id}/manual-interaction", summary="Ativar funil de interação manualmente")
async def trigger_manual_interaction(
    trigger_id: int,
    payload: ManualInteractionPayload,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    trigger = db.query(models.ScheduledTrigger).filter_by(id=trigger_id, client_id=client_id).first()
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado.")
    
    if not trigger.interaction_funnel_id:
        raise HTTPException(status_code=400, detail="Este disparo não possui um funil de interação configurado.")
    
    from services.utils.phone_utils import normalize_phone
    from datetime import datetime, timezone
    
    triggered_count = 0
    for phone_raw in payload.phones:
        phone = normalize_phone(phone_raw)
        if not phone:
            continue
            
        # 1. Tentar encontrar a mensagem correspondente
        msg = db.query(models.MessageStatus).filter_by(trigger_id=trigger_id, phone_number=phone).first()
        if msg:
            if msg.status != 'interaction':
                msg.status = 'interaction'
                msg.is_interaction = True
                if not msg.interaction_counted:
                    msg.interaction_counted = True
                    trigger.total_interactions = (trigger.total_interactions or 0) + 1
        else:
            # Se não existir, criar uma mensagem fictícia para o relatório
            msg = models.MessageStatus(
                trigger_id=trigger_id,
                message_id=f"manual_int_{uuid.uuid4().hex[:12]}",
                phone_number=phone,
                contact_name="Contato Manual",
                status='interaction',
                is_interaction=True,
                interaction_counted=True,
                message_type='FREE_MESSAGE',
                content="[Interação Manual]"
            )
            db.add(msg)
            trigger.total_interactions = (trigger.total_interactions or 0) + 1
            trigger.total_contacts = (trigger.total_contacts or 0) + 1
            trigger.total_sent = (trigger.total_sent or 0) + 1
            trigger.total_delivered = (trigger.total_delivered or 0) + 1
            
        db.commit()
        
        # 2. Criar a trigger filha para o funil de interação
        child_trigger = models.ScheduledTrigger(
            client_id=client_id,
            funnel_id=trigger.interaction_funnel_id,
            conversation_id=msg.chatwoot_conversation_id or 0,
            contact_phone=phone,
            contact_name=msg.contact_name or "Contato Manual",
            status='processing',
            scheduled_time=datetime.now(timezone.utc),
            is_bulk=False,
            is_interaction=True,
            parent_id=trigger_id
        )
        db.add(child_trigger)
        db.commit()
        db.refresh(child_trigger)
        
        # Criar registro inicial de status de mensagem para a trigger filha
        init_status = models.MessageStatus(
            trigger_id=child_trigger.id,
            message_id=f"funnel_init_{child_trigger.id}",
            phone_number=phone,
            contact_name=msg.contact_name or phone,
            status='sent',
            message_type='FREE_MESSAGE',
            content=f"[Funil Iniciado] {trigger.funnel.name if trigger.funnel else 'Funil'}"
        )
        db.add(init_status)
        db.commit()
        
        # Publicar no RabbitMQ para executar o funil de interação
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": child_trigger.id,
            "funnel_id": trigger.interaction_funnel_id,
            "contact_phone": phone
        })
        triggered_count += 1
        
    await rabbitmq.publish_event("trigger_updated", {"trigger_id": trigger_id, "status": trigger.status, "client_id": client_id})
    return {"status": "success", "triggered_count": triggered_count}

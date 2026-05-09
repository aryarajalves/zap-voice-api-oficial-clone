from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import models, schemas
from core.deps import get_current_user, get_db
from rabbitmq_client import rabbitmq

router = APIRouter()

@router.get("/{trigger_id}", response_model=schemas.ScheduledTrigger, summary="Obter detalhes de um disparo específico")
def get_trigger(
    trigger_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna os detalhes de um disparo específico.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status != 'deleted_pending'
    ).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado ou sem permissão.")
        
    return trigger

@router.get("", response_model=schemas.TriggerListResponse, summary="Listar Disparos e Agendamentos")
def list_triggers(
    skip: int = 0, 
    limit: int = 100, 
    funnel_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    trigger_type: Optional[str] = None,
    exclude_webhooks: bool = True,
    show_technical: bool = False,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna lista de disparos (triggers) paginada.
    """
    query = db.query(models.ScheduledTrigger)
    client_id = x_client_id if x_client_id else current_user.client_id
    query = query.filter(models.ScheduledTrigger.client_id == client_id)
    
    # Sempre ocultar registros em processo de deleção suave (evita deadlocks visíveis)
    query = query.filter(models.ScheduledTrigger.status != 'deleted_pending')
    
    if exclude_webhooks:
        query = query.filter(models.ScheduledTrigger.integration_id == None)
    
    if not show_technical:
        query = query.filter(or_(
            models.ScheduledTrigger.template_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.template_name == None
        ))
        query = query.filter(or_(
            models.ScheduledTrigger.product_name != "HIDDEN_CHILD",
            models.ScheduledTrigger.product_name == None
        ))
        query = query.filter(models.ScheduledTrigger.parent_id == None)
    
    if funnel_name:
        query = query.join(models.Funnel).filter(models.Funnel.name.ilike(f"%{funnel_name}%"))
    if status:
        if status == 'pending':
            query = query.filter(models.ScheduledTrigger.status.in_(['pending', 'queued', 'Queued']))
        else:
            query = query.filter(models.ScheduledTrigger.status == status)
    
    # Datas podem vir como string do Header/Form
    from datetime import datetime
    if start_date:
        try: query = query.filter(models.ScheduledTrigger.created_at >= datetime.fromisoformat(start_date))
        except: pass
    if end_date:
        try: query = query.filter(models.ScheduledTrigger.created_at <= datetime.fromisoformat(end_date))
        except: pass
    
    if trigger_type:
        if trigger_type == 'bulk':
            query = query.filter(models.ScheduledTrigger.is_bulk == True)
        elif trigger_type == 'single':
            query = query.filter(models.ScheduledTrigger.is_bulk == False)

    total = query.count()
    triggers = query.order_by(models.ScheduledTrigger.created_at.desc()).offset(skip).limit(limit).all()

    for trigger in triggers:
        if trigger.sent_as is None and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            if first_msg.message_type:
                trigger.sent_as = first_msg.message_type
        
        trigger.child_count = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.parent_id == trigger.id).count()

    return {"items": triggers, "total": total}

@router.delete("/{trigger_id}", summary="Excluir Registro de Disparo")
async def delete_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Remove permanentemente o histórico de um disparo.
    """
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir históricos")

    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
    
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")

    if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Capturar o client_id real do registro antes de deletar
    target_client_id = trigger.client_id
    
    if trigger.status == 'processing':
        # Se está processando, apenas marcamos para sumir da UI e sinalizar o worker
        trigger.status = 'deleted_pending'
    else:
        db.delete(trigger)
        
    db.commit()
    
    # Notificar via WebSocket usando o client_id do registro (corrige bug do Super Admin)
    await rabbitmq.publish_event("trigger_deleted", {
        "trigger_id": trigger_id,
        "client_id": target_client_id
    })
    
    return {"message": "Historic record deleted"}

@router.post("/bulk-delete", summary="Excluir múltiplos registros de disparo")
async def bulk_delete_triggers(
    payload: schemas.BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Exclui vários registros de uma vez usando uma única transação.
    """
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir históricos")

    triggers = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id.in_(payload.ids)).all()
    
    if not triggers:
        return {"message": "Nenhum registro encontrado", "deleted_count": 0}

    deleted_count = 0
    for trigger in triggers:
        # Segurança: Admin comum só apaga do seu próprio cliente
        if current_user.role == 'admin' and trigger.client_id != current_user.client_id:
            continue
            
        t_id = trigger.id
        t_client_id = trigger.client_id
        
        if trigger.status == 'processing':
            # Se está processando, apenas marcamos para sumir da UI e sinalizar o worker
            # Isso evita o Deadlock brutal com o Worker que está tentando dar lock na mesma linha
            trigger.status = 'deleted_pending'
            db.flush()
        else:
            db.delete(trigger)
            deleted_count += 1
        
        # Notificar exclusão individual para atualização reativa da UI
        # Mesmo que seja soft delete, avisamos a UI para remover da lista
        await rabbitmq.publish_event("trigger_deleted", {
            "trigger_id": t_id,
            "client_id": t_client_id
        })

    db.commit()
    return {"message": f"{deleted_count} registros excluídos com sucesso", "deleted_count": deleted_count}

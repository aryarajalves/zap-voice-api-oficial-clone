from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
from core.permissions import require_premium, require_user, require_feature

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/funnels", response_model=List[schemas.Funnel], summary="Listar todos os funis")
def list_funnels(
    skip: int = 0,
    limit: int = 100,
    is_archived: Optional[bool] = False,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("funnels"))
):
    """
    Retorna uma lista paginada de todos os funis de automação cadastrados.
    """
    query = db.query(models.Funnel).filter(
        models.Funnel.client_id == x_client_id
    )
    if is_archived is not None:
        query = query.filter(models.Funnel.is_archived == is_archived)
        
    funnels = query.order_by(models.Funnel.is_pinned.desc(), models.Funnel.id.desc()).offset(skip).limit(limit).all()
    return funnels

@router.patch("/funnels/bulk/archive", summary="Arquivar/Desarquivar múltiplos funis")
def archive_funnels_bulk(
    payload: schemas.FunnelBulkArchive,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    funnels = db.query(models.Funnel).filter(
        models.Funnel.id.in_(payload.funnel_ids),
        models.Funnel.client_id == x_client_id
    ).all()
    
    if payload.is_archived:
        for f in funnels:
            if f.is_pinned:
                raise HTTPException(status_code=400, detail="Não é possível arquivar um ou mais funis que estão fixados no topo.")
                
    for f in funnels:
        f.is_archived = payload.is_archived
        
    db.commit()
    return {"message": f"{len(funnels)} funis atualizados com sucesso", "updated_count": len(funnels)}

@router.patch("/funnels/bulk/tag", summary="Atualizar etiqueta de múltiplos funis")
def tag_funnels_bulk(
    payload: schemas.FunnelBulkTag,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    funnels = db.query(models.Funnel).filter(
        models.Funnel.id.in_(payload.funnel_ids),
        models.Funnel.client_id == x_client_id
    ).all()
    
    for f in funnels:
        f.tag = payload.tag
        
    db.commit()
    return {"message": f"{len(funnels)} funis atualizados com sucesso", "updated_count": len(funnels)}

@router.delete("/funnels/bulk", summary="Excluir múltiplos funis")
def delete_funnels_bulk(
    payload: schemas.FunnelBulkDelete,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Remove permanentemente múltiplos funis do sistema de uma vez.
    """
    # Busca todos os funis que pertencem ao cliente e estão na lista de IDs
    query = db.query(models.Funnel).filter(
        models.Funnel.id.in_(payload.funnel_ids),
        models.Funnel.client_id == x_client_id
    )
    
    funnels_to_delete = query.all()
    count = len(funnels_to_delete)
    
    if count == 0:
        return {"message": "Nenhum funil encontrado para excluir", "deleted_count": 0}
        
    for f in funnels_to_delete:
        if f.is_pinned:
            raise HTTPException(status_code=400, detail="Não é possível excluir um ou mais funis que estão fixados no topo.")
    
    funnel_ids = [f.id for f in funnels_to_delete]

    # 1. Update Triggers (History)
    db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.funnel_id.in_(funnel_ids)
    ).update({models.ScheduledTrigger.funnel_id: None}, synchronize_session=False)

    # 1.1 Update Webhook Event Mappings
    db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.funnel_id.in_(funnel_ids)
    ).update({models.WebhookEventMapping.funnel_id: None}, synchronize_session=False)

    # 1.2 Update Recurring Triggers
    db.query(models.RecurringTrigger).filter(
        models.RecurringTrigger.funnel_id.in_(funnel_ids)
    ).update({models.RecurringTrigger.funnel_id: None}, synchronize_session=False)


    # 2. Delete Webhooks
    # First delete events to avoid Foreign Key violation
    webhook_ids_query = db.query(models.WebhookConfig.id).filter(
        models.WebhookConfig.funnel_id.in_(funnel_ids)
    ).all()
    webhook_ids = [w[0] for w in webhook_ids_query]
    
    if webhook_ids:
        db.query(models.WebhookEvent).filter(
            models.WebhookEvent.webhook_id.in_(webhook_ids)
        ).delete(synchronize_session=False)

    db.query(models.WebhookConfig).filter(
        models.WebhookConfig.funnel_id.in_(funnel_ids)
    ).delete(synchronize_session=False)

    for f in funnels_to_delete:
        db.delete(f)
    
    db.commit()
    return {"message": f"{count} funis excluídos com sucesso", "deleted_count": count}

@router.get("/funnels/{funnel_id}", response_model=schemas.Funnel, summary="Obter detalhes de um funil")
def read_funnel(
    funnel_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Busca um funil específico pelo seu ID.
    Retorna 404 se não encontrado.
    """
    funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return funnel

@router.post("/funnels", response_model=schemas.Funnel, summary="Criar novo funil")
def create_funnel(
    funnel: schemas.FunnelCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Cria um novo funil de automação.

    - **name**: Nome interno do funil.
    - **steps**: Lista de passos (mensagens, delays, mídias).
    - **trigger_phrase**: (Opcional) Gatilho de texto exato.
    """
    # Check for duplicate name for this client
    existing = db.query(models.Funnel).filter(
        models.Funnel.name == funnel.name,
        models.Funnel.client_id == x_client_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um funil com este nome.")
    
    # Prepare steps payload
    steps_data = funnel.steps
    if isinstance(steps_data, list):
        # Legacy: Convert list of Pydantic models to list of dicts
        steps_payload = [s.dict() if hasattr(s, 'dict') else s for s in steps_data]
    else:
        # Graph: Already a dict (JSON)
        steps_payload = steps_data

    # Validar nós bloqueados
    import json
    try:
        blocked_nodes = json.loads(current_user.blocked_nodes or "[]")
    except:
        blocked_nodes = []
    
    if blocked_nodes and current_user.role != "super_admin":
        # Extrair nós dependendo do formato do payload (legacy list ou graph dict)
        nodes_list = []
        if isinstance(steps_payload, list):
            nodes_list = steps_payload
        elif isinstance(steps_payload, dict) and "nodes" in steps_payload:
            nodes_list = steps_payload.get("nodes", [])
        
        for node in nodes_list:
            node_type = node.get("type") if isinstance(node, dict) else getattr(node, "type", None)
            if node_type in blocked_nodes:
                raise HTTPException(status_code=403, detail=f"Você não tem permissão para usar o nó do tipo '{node_type}'.")

    db_funnel = models.Funnel(
        name=funnel.name, 
        description=funnel.description, 
        steps=steps_payload,
        trigger_phrase=funnel.trigger_phrase,
        allowed_phones=funnel.allowed_phones,
        blocked_phones=funnel.blocked_phones,
        allowed_phone=funnel.allowed_phone,
        business_hours_start=funnel.business_hours_start,
        business_hours_end=funnel.business_hours_end,
        business_hours_days=funnel.business_hours_days,
        is_archived=funnel.is_archived,
        tag=funnel.tag,
        client_id=x_client_id
    )

    db.add(db_funnel)
    db.commit()
    db.refresh(db_funnel)
    return db_funnel

@router.put("/funnels/{funnel_id}", response_model=schemas.Funnel, summary="Atualizar funil existente")
def update_funnel(
    funnel_id: int,
    funnel_update: schemas.FunnelCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Atualiza as propriedades e passos de um funil existente.
    """
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    # Check for duplicate name for this client (ignoring self)
    existing = db.query(models.Funnel).filter(
        models.Funnel.name == funnel_update.name,
        models.Funnel.client_id == x_client_id,
        models.Funnel.id != funnel_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um funil com este nome.")
    
    db_funnel.name = funnel_update.name
    db_funnel.description = funnel_update.description
    db_funnel.trigger_phrase = funnel_update.trigger_phrase
    db_funnel.allowed_phones = funnel_update.allowed_phones
    db_funnel.blocked_phones = funnel_update.blocked_phones
    db_funnel.allowed_phone = funnel_update.allowed_phone
    db_funnel.business_hours_start = funnel_update.business_hours_start
    db_funnel.business_hours_end = funnel_update.business_hours_end
    db_funnel.business_hours_days = funnel_update.business_hours_days
    db_funnel.is_archived = funnel_update.is_archived
    db_funnel.tag = funnel_update.tag
    
    steps_data = funnel_update.steps
    if isinstance(steps_data, list):
        steps_payload = [s.dict() if hasattr(s, 'dict') else s for s in steps_data]
    else:
        steps_payload = steps_data

    # Validar nós bloqueados
    import json
    try:
        blocked_nodes = json.loads(current_user.blocked_nodes or "[]")
    except:
        blocked_nodes = []
    
    if blocked_nodes and current_user.role != "super_admin":
        nodes_list = []
        if isinstance(steps_payload, list):
            nodes_list = steps_payload
        elif isinstance(steps_payload, dict) and "nodes" in steps_payload:
            nodes_list = steps_payload.get("nodes", [])
        
        for node in nodes_list:
            node_type = node.get("type") if isinstance(node, dict) else getattr(node, "type", None)
            if node_type in blocked_nodes:
                raise HTTPException(status_code=403, detail=f"Você não tem permissão para usar o nó do tipo '{node_type}'.")

    db_funnel.steps = steps_payload
        
    db.commit()
    db.refresh(db_funnel)
    return db_funnel


@router.patch("/funnels/{funnel_id}/archive", response_model=schemas.Funnel, summary="Arquivar/Desarquivar funil")
def archive_funnel(
    funnel_id: int,
    payload: dict,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
        
    is_archived = payload.get("is_archived", True)
    if is_archived and db_funnel.is_pinned:
        raise HTTPException(status_code=400, detail="Não é possível arquivar um funil que está fixado no topo.")
        
    db_funnel.is_archived = is_archived
    db.commit()
    db.refresh(db_funnel)
    return db_funnel

@router.patch("/funnels/{funnel_id}/tag", response_model=schemas.Funnel, summary="Atualizar etiqueta do funil")
def tag_funnel(
    funnel_id: int,
    payload: dict,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
        
    db_funnel.tag = payload.get("tag")
    db.commit()
    db.refresh(db_funnel)
    return db_funnel

@router.patch("/funnels/{funnel_id}/pin", response_model=schemas.Funnel, summary="Fixar/Desafixar funil no topo")
def pin_funnel(
    funnel_id: int,
    payload: dict,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
        
    is_pinned = payload.get("is_pinned", False)
    if is_pinned:
        pinned_count = db.query(models.Funnel).filter(
            models.Funnel.client_id == x_client_id,
            models.Funnel.is_pinned == True,
            models.Funnel.id != funnel_id
        ).count()
        if pinned_count >= 3:
            raise HTTPException(status_code=400, detail="Você só pode fixar até 3 funis no topo!")
            
    db_funnel.is_pinned = is_pinned
    db.commit()
    db.refresh(db_funnel)
    return db_funnel

@router.post("/funnels/{funnel_id}/duplicate", response_model=schemas.Funnel, summary="Duplicar funil existente")
def duplicate_funnel(
    funnel_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Clona um funil existente, gerando um nome exclusivo com o sufixo ' (Cópia)'
    """
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    # Gerar nome único para a cópia
    base_name = f"{db_funnel.name} (Cópia)"
    new_name = base_name
    counter = 1
    while True:
        existing = db.query(models.Funnel).filter(
            models.Funnel.name == new_name,
            models.Funnel.client_id == x_client_id
        ).first()
        if not existing:
            break
        counter += 1
        new_name = f"{base_name} {counter}"

    # Duplicar objeto
    duplicated_funnel = models.Funnel(
        name=new_name,
        description=db_funnel.description,
        steps=db_funnel.steps,
        trigger_phrase=db_funnel.trigger_phrase,
        allowed_phones=db_funnel.allowed_phones,
        blocked_phones=db_funnel.blocked_phones,
        allowed_phone=db_funnel.allowed_phone,
        business_hours_start=db_funnel.business_hours_start,
        business_hours_end=db_funnel.business_hours_end,
        business_hours_days=db_funnel.business_hours_days,
        is_archived=db_funnel.is_archived,
        tag=db_funnel.tag,
        client_id=x_client_id
    )

    db.add(duplicated_funnel)
    db.commit()
    db.refresh(duplicated_funnel)
    return duplicated_funnel

@router.delete("/funnels/{funnel_id}", summary="Excluir funil")
def delete_funnel(
    funnel_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Remove permanentemente um funil do sistema.
    """
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
        
    if db_funnel.is_pinned:
        raise HTTPException(status_code=400, detail="Não é possível excluir um funil que está fixado no topo.")
    
    # 1. Handle ScheduledTriggers (History)
    # Set funnel_id to NULL to preserve history involved in this funnel
    db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.funnel_id == funnel_id
    ).update({models.ScheduledTrigger.funnel_id: None}, synchronize_session=False)

    # 1.1 Handle WebhookEventMappings
    db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.funnel_id == funnel_id
    ).update({models.WebhookEventMapping.funnel_id: None}, synchronize_session=False)

    # 1.2 Handle RecurringTriggers
    db.query(models.RecurringTrigger).filter(
        models.RecurringTrigger.funnel_id == funnel_id
    ).update({models.RecurringTrigger.funnel_id: None}, synchronize_session=False)

    # 2. Handle WebhookConfigs
    # Delete webhooks associated with this funnel as they cannot exist without it
    # First delete events to avoid Foreign Key violation
    webhook_ids_query = db.query(models.WebhookConfig.id).filter(
        models.WebhookConfig.funnel_id == funnel_id
    ).all()
    webhook_ids = [w[0] for w in webhook_ids_query]
    
    if webhook_ids:
        db.query(models.WebhookEvent).filter(
            models.WebhookEvent.webhook_id.in_(webhook_ids)
        ).delete(synchronize_session=False)

    db.query(models.WebhookConfig).filter(
        models.WebhookConfig.funnel_id == funnel_id
    ).delete(synchronize_session=False)

    db.delete(db_funnel)
    db.commit()
    return {"message": "Funnel deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
from models.trigger import HotLead
from models.auth import User

router = APIRouter(prefix="/hot-leads", tags=["HotLeads"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/sellers")
def list_sellers(
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Buscar vendedores que possuem o x_client_id associado em accessible_clients
    sellers = db.query(User).join(User.accessible_clients).filter(
        models.Client.id == x_client_id,
        User.role == "vendedor",
        User.is_active == True
    ).all()
    return [
        {
            "id": s.id,
            "email": s.email,
            "full_name": s.full_name or s.email
        }
        for s in sellers
    ]

@router.get("", response_model=schemas.HotLeadListResponse)
def list_hot_leads(
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(HotLead).options(joinedload(HotLead.assigned_user)).filter(
        HotLead.client_id == x_client_id
    )

    # Regra de Segurança: Vendedores só enxergam seus próprios leads atribuídos ou não atribuídos
    if current_user.role == "vendedor":
        query = query.filter(
            or_(
                HotLead.assigned_user_id == current_user.id,
                HotLead.assigned_user_id.is_(None)
            )
        )

    # Ordenar por mais recentes primeiro
    leads = query.order_by(HotLead.created_at.desc()).all()
    total = len(leads)

    items = []
    for lead in leads:
        assigned_user_name = None
        if lead.assigned_user:
            assigned_user_name = lead.assigned_user.full_name or lead.assigned_user.email
            
        items.append(schemas.HotLead(
            id=lead.id,
            client_id=lead.client_id,
            contact_name=lead.contact_name,
            contact_phone=lead.contact_phone,
            alert_name=lead.alert_name,
            priority=lead.priority,
            context_message=lead.context_message,
            assigned_user_id=lead.assigned_user_id,
            assigned_user_name=assigned_user_name,
            created_at=lead.created_at,
            updated_at=lead.updated_at
        ))

    return schemas.HotLeadListResponse(items=items, total=total)

@router.put("/{lead_id}", response_model=schemas.HotLead)
def update_hot_lead(
    lead_id: int,
    data: schemas.HotLeadUpdate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lead = db.query(HotLead).filter(
        HotLead.id == lead_id,
        HotLead.client_id == x_client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead Quente não encontrado")

    # Restringir que vendedor edite leads alheios ou altere atribuição
    if current_user.role == "vendedor" and lead.assigned_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado para este lead")

    if data.priority is not None:
        lead.priority = data.priority

    if data.assigned_user_id is not None and current_user.role != "vendedor":
        # Validar se o vendedor atribuído pertence ao cliente
        seller = db.query(User).join(User.accessible_clients).filter(
            User.id == data.assigned_user_id,
            models.Client.id == x_client_id,
            User.role == "vendedor"
        ).first()
        if not seller:
            raise HTTPException(status_code=400, detail="Vendedor inválido para este cliente")
        lead.assigned_user_id = data.assigned_user_id

    db.commit()
    db.refresh(lead)

    assigned_user_name = None
    if lead.assigned_user:
        assigned_user_name = lead.assigned_user.full_name or lead.assigned_user.email

    return schemas.HotLead(
        id=lead.id,
        client_id=lead.client_id,
        contact_name=lead.contact_name,
        contact_phone=lead.contact_phone,
        alert_name=lead.alert_name,
        priority=lead.priority,
        context_message=lead.context_message,
        assigned_user_id=lead.assigned_user_id,
        assigned_user_name=assigned_user_name,
        created_at=lead.created_at,
        updated_at=lead.updated_at
    )

@router.delete("/{lead_id}")
def delete_hot_lead(
    lead_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lead = db.query(HotLead).filter(
        HotLead.id == lead_id,
        HotLead.client_id == x_client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead Quente não encontrado")

    # Apenas administradores ou usuários padrão (não vendedores) podem deletar leads
    if current_user.role == "vendedor":
        raise HTTPException(status_code=403, detail="Vendedores não possuem permissão para excluir leads")

    db.delete(lead)
    db.commit()
    return {"message": "Lead Quente excluído com sucesso"}

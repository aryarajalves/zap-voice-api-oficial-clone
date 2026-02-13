from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.deps import get_db, get_current_user
from core.permissions import require_super_admin
from models import Client, User
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/clients", tags=["Clients"])

class ClientCreate(BaseModel):
    name: str

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class ClientResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ClientResponse])
def list_clients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all active clients.
    Super Admin sees all. Others see only their accessible clients.
    """
    query = db.query(Client).filter(Client.is_active == True)
    
    if current_user.role != 'super_admin':
        # Filtra pelos IDs dos clientes acessíveis ao usuário
        accessible_ids = [c.id for c in current_user.accessible_clients]
        query = query.filter(Client.id.in_(accessible_ids))
        
    clients = query.all()
    return clients

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new client.
    """
    # Check if client name already exists (active or inactive)
    existing = db.query(Client).filter(Client.name == client_data.name).first()
    
    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cliente '{client_data.name}' já existe."
            )
        else:
            # Reactivate inactive client
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
    
    new_client = Client(name=client_data.name)
    db.add(new_client)
    try:
        db.commit()
        db.refresh(new_client)
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar cliente: {str(e)}"
        )
    
    return new_client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Update client information.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if client_data.name:
        # Check for name uniqueness
        existing = db.query(Client).filter(
            Client.name == client_data.name,
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cliente '{client_data.name}' já existe."
            )
        client.name = client_data.name
    
    if client_data.is_active is not None:
        client.is_active = client_data.is_active
    
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Soft delete a client (sets is_active = False).
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    client.is_active = False
    db.commit()
    
    return None

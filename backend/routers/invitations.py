import os
import uuid
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import User, Client, UserInvitation
from core.security import get_password_hash
from core.deps import get_db
from core.permissions import require_super_admin
from core.logger import logger
from websocket_manager import manager

router = APIRouter(prefix="/auth/invitations", tags=["Invitations"])

# --- Schemas de Convite ---
class InvitationCreate(BaseModel):
    validity_hours: Optional[int] = None  # None significa sem expiração
    role: str  # admin, premium, user
    client_ids: List[int] = []
    blocked_features: Optional[List[str]] = []
    blocked_nodes: Optional[List[str]] = []

class InvitationOut(BaseModel):
    id: int
    token: str
    role: str
    expires_at: Optional[datetime] = None
    is_used: bool
    created_at: datetime
    client_ids: List[int]
    blocked_features: List[str]
    blocked_nodes: List[str]

    class Config:
        from_attributes = True

class UserRegisterInvite(BaseModel):
    full_name: str
    email: str
    password: str

# --- Rotas de Convite ---

@router.get("", response_model=List[InvitationOut], summary="Listar Convites de Usuário")
async def list_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Retorna todos os convites criados.
    Requer Super Admin.
    """
    invitations = db.query(UserInvitation).order_by(UserInvitation.created_at.desc()).all()
    out = []
    for invite in invitations:
        try:
            blocked = json.loads(invite.blocked_features or "[]")
        except:
            blocked = []
        try:
            blocked_n = json.loads(invite.blocked_nodes or "[]")
        except:
            blocked_n = []
        out.append(InvitationOut(
            id=invite.id,
            token=invite.token,
            role=invite.role,
            expires_at=invite.expires_at,
            is_used=invite.is_used,
            created_at=invite.created_at,
            blocked_features=blocked,
            blocked_nodes=blocked_n,
            client_ids=[c.id for c in invite.accessible_clients]
        ))
    return out


@router.delete("/{id}", summary="Excluir/Revogar Convite de Usuário")
async def delete_invitation(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Exclui um convite de usuário pelo ID.
    Requer Super Admin.
    """
    invite = db.query(UserInvitation).filter(UserInvitation.id == id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    
    try:
        db.delete(invite)
        db.commit()
        return {"message": "Convite excluído com sucesso!"}
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao excluir convite: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir convite: {str(e)}")


@router.post("", response_model=InvitationOut, summary="Criar Convite de Usuário")
async def create_invitation(
    invite_in: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Gera um novo convite de usuário (token único) com expiração e acessos definidos.
    Requer Super Admin.
    """
    try:
        # Calcular expiração se aplicável
        expires_at = None
        if invite_in.validity_hours and invite_in.validity_hours > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=invite_in.validity_hours)

        token = str(uuid.uuid4())
        
        # Validar clientes
        clients = []
        if invite_in.client_ids:
            clients = db.query(Client).filter(Client.id.in_(invite_in.client_ids)).all()

        new_invite = UserInvitation(
            token=token,
            role=invite_in.role,
            expires_at=expires_at,
            is_used=False,
            created_by_id=current_user.id,
            blocked_features=json.dumps(invite_in.blocked_features or []),
            blocked_nodes=json.dumps(invite_in.blocked_nodes or []),
            accessible_clients=clients
        )

        db.add(new_invite)
        db.commit()
        db.refresh(new_invite)

        return InvitationOut(
            id=new_invite.id,
            token=new_invite.token,
            role=new_invite.role,
            expires_at=new_invite.expires_at,
            is_used=new_invite.is_used,
            created_at=new_invite.created_at,
            blocked_features=invite_in.blocked_features or [],
            blocked_nodes=invite_in.blocked_nodes or [],
            client_ids=[c.id for c in new_invite.accessible_clients]
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar convite: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar convite: {str(e)}")


@router.get("/{token}", summary="Verificar Convite de Usuário (Público)")
async def get_invitation_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica se o token de convite é válido, não expirou e não foi utilizado.
    Endpoint público.
    """
    invite = db.query(UserInvitation).filter(UserInvitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite inválido ou não encontrado.")
    
    if invite.is_used:
        raise HTTPException(status_code=400, detail="Este convite já foi utilizado.")
    
    if invite.expires_at:
        now = datetime.now(timezone.utc)
        expires_at_utc = invite.expires_at.astimezone(timezone.utc) if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_utc < now:
            raise HTTPException(status_code=400, detail="Este convite expirou.")

    try:
        blocked = json.loads(invite.blocked_features or "[]")
    except:
        blocked = []
    try:
        blocked_nodes = json.loads(invite.blocked_nodes or "[]")
    except:
        blocked_nodes = []
    return {
        "token": invite.token,
        "role": invite.role,
        "blocked_features": blocked,
        "blocked_nodes": blocked_nodes,
        "client_names": [c.name for c in invite.accessible_clients]
    }


@router.post("/{token}/register", summary="Registrar Usuário via Convite (Público)")
async def register_by_invitation(
    token: str,
    user_in: UserRegisterInvite,
    db: Session = Depends(get_db)
):
    """
    Cadastra um novo usuário no sistema associado a um convite válido.
    Endpoint público.
    """
    invite = db.query(UserInvitation).filter(UserInvitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite inválido ou não encontrado.")
    
    if invite.is_used:
        raise HTTPException(status_code=400, detail="Este convite já foi utilizado.")
    
    if invite.expires_at:
        now = datetime.now(timezone.utc)
        expires_at_utc = invite.expires_at.astimezone(timezone.utc) if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_utc < now:
            raise HTTPException(status_code=400, detail="Este convite expirou.")

    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado no sistema.")

    try:
        # Criar o usuário
        try:
            blocked_features_val = invite.blocked_features or "[]"
            # Validar se decodifica como array
            json.loads(blocked_features_val)
        except:
            blocked_features_val = "[]"

        try:
            blocked_nodes_val = invite.blocked_nodes or "[]"
            json.loads(blocked_nodes_val)
        except:
            blocked_nodes_val = "[]"

        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            role=invite.role,
            blocked_features=blocked_features_val,
            blocked_nodes=blocked_nodes_val,
            is_active=True
        )

        # Conceder acessos aos clientes definidos no convite
        new_user.accessible_clients = invite.accessible_clients
        db.add(new_user)
        
        # Marcar convite como usado
        invite.is_used = True
        db.commit()
        db.refresh(new_user)

        try:
            blocked_arr = json.loads(blocked_features_val)
        except:
            blocked_arr = []

        try:
            blocked_nodes_arr = json.loads(blocked_nodes_val)
        except:
            blocked_nodes_arr = []

        # Enviar websocket de sincronização para a lista de usuários logados
        await manager.broadcast({
            "event": "user_created",
            "data": {
                "id": new_user.id,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "role": new_user.role,
                "is_active": new_user.is_active,
                "blocked_features": blocked_arr,
                "blocked_nodes": blocked_nodes_arr,
                "client_ids": [c.id for c in new_user.accessible_clients]
            }
        })

        return {"message": "Conta registrada e ativada com sucesso!", "user_id": new_user.id}

    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao registrar usuário via convite: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no processamento do cadastro: {str(e)}")

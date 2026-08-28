import os
import uuid
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from models import User, Client, UserInvitation, EmailVerificationCode
from core.security import get_password_hash, limiter, validate_password_strength
from services.brevo_service import send_verification_email

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

class InviteSendCodeRequest(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=12, max_length=128, description="Senha do usuário com no mínimo 12 caracteres")
    confirm_password: str

class UserRegisterInvite(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=12, max_length=128, description="Senha do usuário com no mínimo 12 caracteres")
    code: str = Field(..., min_length=6, max_length=10, description="Código de 6 dígitos recebido por e-mail")


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
    invitations = db.query(UserInvitation).options(selectinload(UserInvitation.accessible_clients)).order_by(UserInvitation.created_at.desc()).all()
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
@limiter.limit("20/minute")
async def get_invitation_by_token(
    request: Request,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica se o token de convite é válido, não expirou e não foi utilizado.
    Endpoint público com rate limiting.
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


@router.post("/{token}/send-code", summary="Enviar Código de Verificação por E-mail (Brevo)")
@limiter.limit("5/minute")
async def send_verification_code(
    request: Request,
    token: str,
    payload: InviteSendCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Valida os dados de cadastro, regras de senha e dispara um e-mail transacional via Brevo
    com o código de segurança de 6 dígitos.
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

    # 1. Validar igualdade de senhas
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="As senhas informadas não coincidem.")

    # 2. Validar força da senha
    is_valid_pw, pw_error = validate_password_strength(payload.password)
    if not is_valid_pw:
        raise HTTPException(status_code=400, detail=pw_error)

    # 3. Validar se o e-mail já existe
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado no sistema.")

    try:
        # Invalida códigos anteriores não utilizados deste e-mail para este token
        db.query(EmailVerificationCode).filter(
            EmailVerificationCode.email == payload.email,
            EmailVerificationCode.token == token,
            EmailVerificationCode.is_used == False
        ).update({"is_used": True})

        # Gera código numérico seguro de 6 dígitos
        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        new_verification = EmailVerificationCode(
            email=payload.email,
            code=code,
            token=token,
            expires_at=expires_at,
            is_used=False,
            attempts=0
        )
        db.add(new_verification)
        db.commit()

        # Envia e-mail transacional via Brevo
        email_result = await send_verification_email(
            to_email=payload.email,
            code=code,
            recipient_name=payload.full_name
        )

        if not email_result.get("success"):
            logger.error(f"❌ Falha ao enviar código Brevo para {payload.email}: {email_result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Não foi possível enviar o e-mail de verificação: {email_result.get('error')}"
            )

        return {"message": "Código de verificação enviado com sucesso para o seu e-mail!"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao processar envio de código de verificação: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar código de verificação: {str(e)}")


@router.post("/{token}/register", summary="Registrar Usuário via Convite (Público)")
@limiter.limit("10/minute")
async def register_by_invitation(
    request: Request,
    token: str,
    user_in: UserRegisterInvite,
    db: Session = Depends(get_db)
):
    """
    Cadastra um novo usuário no sistema associado a um convite válido,
    validando o código de segurança de 6 dígitos enviado por e-mail via Brevo.
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

    # Validar força da senha
    is_valid_pw, pw_error = validate_password_strength(user_in.password)
    if not is_valid_pw:
        raise HTTPException(status_code=400, detail=pw_error)

    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado no sistema.")

    # Validar código de ativação do e-mail
    clean_code = user_in.code.replace(" ", "").strip()
    code_record = db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == user_in.email,
        EmailVerificationCode.token == token,
        EmailVerificationCode.is_used == False
    ).order_by(EmailVerificationCode.created_at.desc()).first()

    if not code_record:
        raise HTTPException(
            status_code=400,
            detail="Nenhum código de verificação pendente encontrado para este e-mail. Solicite um novo código."
        )

    if code_record.attempts >= 5:
        code_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Número máximo de tentativas excedido. Solicite um novo código de verificação."
        )

    now = datetime.now(timezone.utc)
    expires_utc = code_record.expires_at.astimezone(timezone.utc) if code_record.expires_at.tzinfo else code_record.expires_at.replace(tzinfo=timezone.utc)
    if expires_utc < now:
        code_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="O código de verificação expirou. Solicite um novo código."
        )

    if code_record.code != clean_code:
        code_record.attempts += 1
        db.commit()
        remaining = 5 - code_record.attempts
        if remaining > 0:
            raise HTTPException(status_code=400, detail=f"Código de verificação incorreto. Restam {remaining} tentativa(s).")
        else:
            code_record.is_used = True
            db.commit()
            raise HTTPException(status_code=400, detail="Código incorreto. Limite de tentativas atingido. Solicite um novo código.")

    try:
        # Marcar código como validado e consumido
        code_record.is_used = True

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

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao registrar usuário via convite: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no processamento do cadastro: {str(e)}")


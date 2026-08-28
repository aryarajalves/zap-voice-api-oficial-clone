import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, selectinload

from models import User, Client, UserInvitation, PasswordResetToken
from core.security import verify_password, get_password_hash, needs_rehash, create_access_token, limiter, validate_password_strength
from core.deps import get_current_user, get_db
from core.permissions import require_super_admin
from core.logger import logger
from websocket_manager import manager
from pydantic import BaseModel, Field
from typing import Optional, List

import uuid
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=12, max_length=128, description="Senha do usuário com no mínimo 12 caracteres")
    full_name: Optional[str] = None
    role: Optional[str] = "user"
    client_ids: Optional[List[int]] = []
    seller_weight: Optional[int] = 1
    blocked_features: Optional[List[str]] = []
    blocked_nodes: Optional[List[str]] = []

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=12, max_length=128, description="Nova senha com no mínimo 12 caracteres")



@router.post("/token", response_model=Token, summary="Login e Obtenção de Token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Autentica um usuário via email e senha.
    Retorna um **Access Token JWT** que deve ser usado no header `Authorization: Bearer <token>` para acessar rotas protegidas.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua conta foi desativada pelo administrador.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Migração automática transparente para Argon2id + Pepper se o hash for legado
    try:
        if needs_rehash(user.hashed_password):
            user.hashed_password = get_password_hash(form_data.password)
            db.commit()
            logger.info(f"🔒 [SECURITY] Senha de '{user.email}' migrada automaticamente para Argon2id + Pepper.")
    except Exception as e:
        logger.warning(f"⚠️ [SECURITY] Erro não-bloqueante ao atualizar hash de '{user.email}': {e}")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", summary="Obter Meu Perfil")
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Retorna informações detalhadas (ID, email, nome) do usuário autenticado atualmente.
    """
    import json
    try:
        blocked = json.loads(current_user.blocked_features or "[]")
    except:
        blocked = []
    try:
        blocked_nodes = json.loads(current_user.blocked_nodes or "[]")
    except:
        blocked_nodes = []
    try:
        pages_status = json.loads(current_user.pages_status or "{}")
    except:
        pages_status = {}
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "blocked_features": blocked,
        "blocked_nodes": blocked_nodes,
        "pages_status": pages_status,
    }



@router.put("/me", summary="Atualizar Meu Perfil")
async def update_my_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permite que o usuário logado atualize seu próprio nome, email e senha.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if profile_in.full_name is not None:
        user.full_name = profile_in.full_name

    if profile_in.email is not None and profile_in.email != user.email:
        existing = db.query(User).filter(User.email == profile_in.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Este email já está em uso por outro usuário")
        user.email = profile_in.email

    if profile_in.password:
        is_valid_pw, pw_err = validate_password_strength(profile_in.password)
        if not is_valid_pw:
            raise HTTPException(status_code=400, detail=pw_err)
        user.hashed_password = get_password_hash(profile_in.password)

    try:
        db.commit()
        db.refresh(user)

        user_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
        await manager.broadcast({
            "event": "profile_updated",
            "user_id": user.id,
            "data": user_data
        })

        return {"message": "Perfil atualizado com sucesso", "user": user_data}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar perfil: {str(e)}")

from fastapi import Header

@router.post("/register", summary="Registrar Novo Usuário")
async def register(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Cria um novo usuário no sistema. Requer autenticação de Super Admin.
    """
    try:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Este email já está cadastrado")

        is_valid_pw, pw_err = validate_password_strength(user.password)
        if not is_valid_pw:
            raise HTTPException(status_code=400, detail=pw_err)

        import json
        hashed_password = get_password_hash(user.password)
        new_user = User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role=user.role or "user",
            seller_weight=user.seller_weight if user.seller_weight is not None else 1,
            blocked_features=json.dumps(user.blocked_features or []),
            blocked_nodes=json.dumps(user.blocked_nodes or []),
            is_active=True
        )


        if user.client_ids:
            clients = db.query(Client).filter(Client.id.in_(user.client_ids)).all()
            new_user.accessible_clients = clients

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        await manager.broadcast({
            "event": "user_created",
            "data": {
                "id": new_user.id,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "role": new_user.role,
                "seller_weight": new_user.seller_weight,
                "is_active": new_user.is_active,
                "blocked_features": user.blocked_features or [],
                "blocked_nodes": user.blocked_nodes or [],
                "client_ids": [c.id for c in new_user.accessible_clients]
            }
        })



        return {"message": "User created successfully", "user_id": new_user.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


class PasswordReset(BaseModel):
    email: str
    new_password: str = Field(..., min_length=12, max_length=128, description="Nova senha com no mínimo 12 caracteres")



@router.post("/reset-password", summary="Resetar Senha Administrativa")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Reseta a senha de um usuário existente. Requer autenticação de Super Admin.
    """
    try:
        user = db.query(User).filter(User.email == reset_data.email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        is_valid_pw, pw_err = validate_password_strength(reset_data.new_password)
        if not is_valid_pw:
            raise HTTPException(status_code=400, detail=pw_err)

        user.hashed_password = get_password_hash(reset_data.new_password)
        db.commit()

        return {
            "message": "Password reset successfully",
            "user_id": user.id,
            "email": user.email
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database-info", summary="Diagnóstico do Banco de Dados")
async def database_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Endpoint de diagnóstico para verificar status do banco de dados.
    Requer autenticação de Super Admin.
    """
    from database import SQLALCHEMY_DATABASE_URL

    try:
        db_info = {
            "database_type": "PostgreSQL" if "postgresql" in SQLALCHEMY_DATABASE_URL else "Unknown",
            "database_url": SQLALCHEMY_DATABASE_URL.split("@")[1] if "@" in SQLALCHEMY_DATABASE_URL else "hidden",
        }

        total_users = db.query(User).count()

        users_list = [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "is_active": u.is_active
            }
            for u in db.query(User).all()
        ]

        return {
            "database": db_info,
            "total_users": total_users,
            "users": users_list
        }

    except Exception as e:
        return {
            "error": str(e),
            "database_url": "ERROR - Could not connect"
        }

@router.get("/users", summary="Listar Usuários")
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Retorna a lista de todos os usuários cadastrados no sistema.
    Requer Super Admin. Não retorna senhas.
    """
    import json
    users = db.query(User).options(selectinload(User.accessible_clients)).all()
    out = []
    for u in users:
        try:
            blocked = json.loads(u.blocked_features or "[]")
        except:
            blocked = []
        try:
            blocked_n = json.loads(u.blocked_nodes or "[]")
        except:
            blocked_n = []

        out.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "seller_weight": u.seller_weight,
            "is_active": u.is_active,
            "blocked_features": blocked,
            "blocked_nodes": blocked_n,
            "client_ids": [c.id for c in u.accessible_clients],
            "setup_completed": getattr(u, "setup_completed", True),
            "setup_percentage": getattr(u, "setup_percentage", 100),
            "pages_status": json.loads(getattr(u, "pages_status", "{}") or "{}"),
        })
    return out



@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir Usuário")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Remove permanentemente um usuário do sistema.
    Proteção: O usuário não pode excluir a si mesmo.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir sua própria conta."
        )

    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    try:
        db.delete(user_to_delete)
        db.commit()

        await manager.broadcast({
            "event": "user_deleted",
            "data": {"user_id": user_id}
        })

        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir usuário: {str(e)}"
        )

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128, description="Nova senha com no mínimo 6 caracteres")
    role: Optional[str] = None

    seller_weight: Optional[int] = None
    is_active: Optional[bool] = None
    client_ids: Optional[List[int]] = None
    blocked_features: Optional[List[str]] = None
    blocked_nodes: Optional[List[str]] = None
    setup_completed: Optional[bool] = None
    setup_percentage: Optional[int] = None
    pages_status: Optional[dict] = None



@router.put("/users/{user_id}", summary="Atualizar Usuário")
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Atualiza dados de um usuário existente.
    Requer Super Admin. Não permite alterar role do Super Admin original.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    is_super_admin_original = user.email == os.getenv("SUPER_ADMIN_EMAIL")

    if is_super_admin_original and user_in.role and user_in.role != "super_admin":
        raise HTTPException(status_code=400, detail="Não é possível alterar o cargo do Super Admin principal")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name

    if user_in.email is not None:
        if user_in.email != user.email:
            existing = db.query(User).filter(User.email == user_in.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Este email já está em uso")
            user.email = user_in.email

    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    if user_in.role is not None and not is_super_admin_original:
        user.role = user_in.role

    if user_in.is_active is not None and not is_super_admin_original:
        user.is_active = user_in.is_active

    if user_in.seller_weight is not None:
        # Garantir peso válido entre 1 e 10
        weight = max(1, min(10, user_in.seller_weight))
        user.seller_weight = weight

    if user_in.client_ids is not None:
        clients = db.query(Client).filter(Client.id.in_(user_in.client_ids)).all()
        user.accessible_clients = clients

    if user_in.blocked_features is not None:
        import json
        user.blocked_features = json.dumps(user_in.blocked_features)

    if user_in.blocked_nodes is not None:
        import json
        user.blocked_nodes = json.dumps(user_in.blocked_nodes)

    if user_in.setup_completed is not None:
        user.setup_completed = user_in.setup_completed

    if user_in.setup_percentage is not None:
        user.setup_percentage = max(0, min(100, user_in.setup_percentage))

    if user_in.pages_status is not None:
        import json as _json
        user.pages_status = _json.dumps(user_in.pages_status)

    try:
        db.commit()
        db.refresh(user)

        import json
        try:
            blocked = json.loads(user.blocked_features or "[]")
        except:
            blocked = []
        try:
            blocked_n = json.loads(user.blocked_nodes or "[]")
        except:
            blocked_n = []

        user_data = {

            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "seller_weight": user.seller_weight,
            "is_active": user.is_active,
            "blocked_features": blocked,
            "blocked_nodes": blocked_n,
            "client_ids": [c.id for c in user.accessible_clients],
            "setup_completed": user.setup_completed,
            "setup_percentage": user.setup_percentage,
            "pages_status": json.loads(user.pages_status or "{}"),
        }
        logger.info(f"User {user.id} updated by {current_user.id}")
        await manager.broadcast({
            "event": "profile_updated",
            "user_id": user.id,
            "data": user_data
        })


        return {"message": "Usuário atualizado com sucesso", "user_id": user.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")


# ── Schemas e Rotas de Link de Redefinição de Senha para Usuários ──────────────

class ResetPasswordLinkCreate(BaseModel):
    validity_hours: Optional[int] = 24

class UserSetNewPasswordRequest(BaseModel):
    password: str = Field(..., min_length=12, max_length=128, description="Nova senha com no mínimo 12 caracteres")
    confirm_password: str


@router.post("/users/{user_id}/reset-password-link", summary="Gerar Link de Redefinição de Senha para Usuário")
async def create_user_reset_password_link(
    user_id: int,
    payload: Optional[ResetPasswordLinkCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Gera um link seguro e único para que o usuário existente defina uma nova senha para a conta dele.
    Requer Super Admin.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    try:
        validity_hours = payload.validity_hours if payload and payload.validity_hours is not None else 24
        expires_at = None
        if validity_hours > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=validity_hours)

        # Invalida tokens anteriores não utilizados deste usuário
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        token = str(uuid.uuid4())
        reset_token = PasswordResetToken(
            token=token,
            user_id=user.id,
            created_by_id=current_user.id,
            expires_at=expires_at,
            is_used=False
        )
        db.add(reset_token)
        db.commit()
        db.refresh(reset_token)

        logger.info(f"🔗 [AUTH] Link de redefinição gerado para o usuário '{user.email}' (ID {user.id}) por Super Admin {current_user.id}")

        return {
            "token": reset_token.token,
            "expires_at": reset_token.expires_at,
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao gerar link de redefinição de senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar link de redefinição: {str(e)}")


@router.get("/reset-password-token/{token}", summary="Verificar Link de Redefinição de Senha (Público)")
@limiter.limit("30/minute")
async def verify_reset_password_token(
    request: Request,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica se o link de redefinição de senha é válido, não expirou e não foi utilizado.
    Endpoint público com rate limiting.
    """
    reset_tok = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not reset_tok:
        raise HTTPException(status_code=404, detail="Link de redefinição inválido ou não encontrado.")

    if reset_tok.is_used:
        raise HTTPException(status_code=400, detail="Este link de redefinição de senha já foi utilizado.")

    if reset_tok.expires_at:
        now = datetime.now(timezone.utc)
        expires_at_utc = reset_tok.expires_at.astimezone(timezone.utc) if reset_tok.expires_at.tzinfo else reset_tok.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_utc < now:
            raise HTTPException(status_code=400, detail="Este link de redefinição de senha expirou.")

    user = db.query(User).filter(User.id == reset_tok.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário associado não encontrado.")

    return {
        "valid": True,
        "token": reset_tok.token,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }


@router.post("/reset-password-token/{token}", summary="Definir Nova Senha via Link (Público)")
@limiter.limit("10/minute")
async def execute_reset_password_by_token(
    request: Request,
    token: str,
    payload: UserSetNewPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Atualiza a senha do usuário com a nova senha escolhida por ele via link seguro.
    Endpoint público com rate limiting.
    """
    reset_tok = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not reset_tok:
        raise HTTPException(status_code=404, detail="Link de redefinição inválido ou não encontrado.")

    if reset_tok.is_used:
        raise HTTPException(status_code=400, detail="Este link de redefinição de senha já foi utilizado.")

    if reset_tok.expires_at:
        now = datetime.now(timezone.utc)
        expires_at_utc = reset_tok.expires_at.astimezone(timezone.utc) if reset_tok.expires_at.tzinfo else reset_tok.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_utc < now:
            raise HTTPException(status_code=400, detail="Este link de redefinição de senha expirou.")

    user = db.query(User).filter(User.id == reset_tok.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário associado não encontrado.")

    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="As senhas informadas não coincidem.")

    is_valid_pw, pw_err = validate_password_strength(payload.password)
    if not is_valid_pw:
        raise HTTPException(status_code=400, detail=pw_err)

    try:
        user.hashed_password = get_password_hash(payload.password)
        user.is_active = True
        reset_tok.is_used = True
        db.commit()

        logger.info(f"✅ [AUTH] Senha do usuário '{user.email}' (ID {user.id}) redefinida com sucesso via token.")
        return {"message": "Sua senha foi redefinida com sucesso! Você já pode fazer login."}

    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao redefinir senha do usuário: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar nova senha: {str(e)}")






import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from models import User, Client
from core.security import verify_password, get_password_hash, create_access_token, limiter
from core.deps import get_current_user, get_db
from core.permissions import require_super_admin
from core.logger import logger
from websocket_manager import manager
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "user"
    client_ids: Optional[List[int]] = []

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

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

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", summary="Obter Meu Perfil")
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Retorna informações detalhadas (ID, email, nome) do usuário autenticado atualmente.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role
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

        hashed_password = get_password_hash(user.password)
        new_user = User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role=user.role or "user",
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
                "is_active": new_user.is_active,
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
    new_password: str


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
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "client_ids": [c.id for c in u.accessible_clients]
        }
        for u in users
    ]

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
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    client_ids: Optional[List[int]] = None

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

    if user_in.client_ids is not None:
        clients = db.query(Client).filter(Client.id.in_(user_in.client_ids)).all()
        user.accessible_clients = clients

    try:
        db.commit()
        db.refresh(user)

        user_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "client_ids": [c.id for c in user.accessible_clients]
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

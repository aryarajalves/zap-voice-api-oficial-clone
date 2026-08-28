from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional
import hashlib
import secrets
from datetime import datetime

from core.deps import get_db, get_current_user, get_validated_client_id
from core.logger import setup_logger
import models
from pydantic import BaseModel, Field

logger = setup_logger(__name__)
router = APIRouter(prefix="/api-keys", tags=["API Keys"])

# Schemas Pydantic locais
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome identificador da chave de API")

class ApiKeyOut(BaseModel):
    id: int
    name: str
    token_prefix: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ApiKeyCreatedResponse(BaseModel):
    id: int
    name: str
    token_prefix: str
    api_key: str
    created_at: datetime


@router.post("", response_model=ApiKeyCreatedResponse, summary="Gerar uma nova chave de API")
def create_api_key(
    payload: ApiKeyCreate,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Gera uma nova chave de API segura para o cliente ativo.
    A chave gerada será exibida apenas esta vez.
    """
    # Gerar token randômico seguro
    raw_token = f"zv_live_{secrets.token_hex(32)}"
    token_prefix = raw_token[:13] # zv_live_ + 5 caracteres
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    try:
        db_key = models.ApiKey(
            client_id=client_id,
            user_id=current_user.id,
            name=payload.name.strip(),
            token_prefix=token_prefix,
            token_hash=token_hash,
            is_active=True
        )
        db.add(db_key)
        db.commit()
        db.refresh(db_key)
        
        logger.info(f"🔑 [API_KEY_CREATED] Nova chave '{payload.name}' gerada pelo usuário {current_user.id} para o cliente {client_id}")
        
        return ApiKeyCreatedResponse(
            id=db_key.id,
            name=db_key.name,
            token_prefix=db_key.token_prefix,
            api_key=raw_token,
            created_at=db_key.created_at
        )
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [API_KEY_CREATE_ERROR] Falha ao criar chave de API: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao gerar a chave de API")


@router.get("", response_model=List[ApiKeyOut], summary="Listar chaves de API do cliente")
def list_api_keys(
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna a lista de chaves de API configuradas para o cliente ativo.
    As chaves cruas nunca são expostas por razões de segurança.
    """
    keys = db.query(models.ApiKey).filter(
        models.ApiKey.client_id == client_id,
        models.ApiKey.is_active == True
    ).order_by(models.ApiKey.created_at.desc()).all()

    return keys


@router.delete("/{key_id}", summary="Revogar uma chave de API")
def delete_api_key(
    key_id: int,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Revoga (exclui fisicamente) uma chave de API ativa.
    Qualquer requisição usando esta chave passará a retornar 401 Unauthorized.
    """
    key = db.query(models.ApiKey).filter(
        models.ApiKey.id == key_id,
        models.ApiKey.client_id == client_id
    ).first()

    if not key:
        raise HTTPException(status_code=404, detail="Chave de API não encontrada ou acesso negado")

    try:
        db.delete(key)
        db.commit()
        logger.info(f"🗑️ [API_KEY_REVOKED] Chave de API {key_id} revogada pelo usuário {current_user.id}")
        return {"status": "success", "message": "Chave de API revogada com sucesso"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [API_KEY_REVOKE_ERROR] Falha ao revogar chave de API: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao revogar a chave de API")


@router.post("/{key_id}/revoke", summary="Revogar uma chave de API via POST")
def revoke_api_key(
    key_id: int,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Revoga (exclui fisicamente) uma chave de API ativa usando método POST para contornar proxies restritivos.
    """
    key = db.query(models.ApiKey).filter(
        models.ApiKey.id == key_id,
        models.ApiKey.client_id == client_id
    ).first()

    if not key:
        raise HTTPException(status_code=404, detail="Chave de API não encontrada ou acesso negado")

    try:
        db.delete(key)
        db.commit()
        logger.info(f"🗑️ [API_KEY_REVOKED_POST] Chave de API {key_id} revogada via POST pelo usuário {current_user.id}")
        return {"status": "success", "message": "Chave de API revogada com sucesso"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [API_KEY_REVOKE_POST_ERROR] Falha ao revogar chave de API via POST: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao revogar a chave de API")


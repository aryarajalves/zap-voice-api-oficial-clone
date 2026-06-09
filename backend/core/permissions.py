from fastapi import Depends, HTTPException, status
from core.deps import get_current_user
from models import User

def require_role(allowed_roles: list):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para realizar esta ação."
            )
        return current_user
    return role_checker

# Dependências específicas
require_super_admin = require_role(["super_admin"])
require_admin = require_role(["super_admin", "admin"])
require_premium = require_role(["super_admin", "admin", "premium"])
require_user = require_role(["super_admin", "admin", "premium", "user"])

import json
from core.logger import logger

def require_feature(feature_name: str):
    """
    Dependencia que garante que o usuario nao possui a feature bloqueada em 'blocked_features'.
    Se a feature estiver bloqueada, retorna 403 Forbidden.
    """
    async def feature_checker(current_user: User = Depends(get_current_user)):
        # Super admin ignora bloqueios de features
        if current_user.role == "super_admin":
            return current_user
            
        try:
            blocked = json.loads(current_user.blocked_features or "[]")
        except Exception as e:
            logger.error(f"Erro ao ler blocked_features do usuario {current_user.id}: {e}")
            blocked = []
            
        if feature_name in blocked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Seu usuário não possui acesso ao painel de {feature_name}."
            )
        return current_user
    return feature_checker


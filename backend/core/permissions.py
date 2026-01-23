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
require_user = require_role(["super_admin", "admin", "user"])

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
from models import User
from core.security import SECRET_KEY, ALGORITHM

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    from core.logger import logger
    
    # 1. Tentar extrair do Authorization Header
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Tentar extrair do X-API-Key Header
    if not token:
        token = request.headers.get("X-API-Key")
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou ausentes.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    # Verificar se é uma API Key (zv_live_...)
    if token.startswith("zv_live_"):
        import hashlib
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        
        from models import ApiKey
        api_key_entry = db.query(ApiKey).filter(
            ApiKey.token_hash == token_hash,
            ApiKey.is_active == True
        ).first()
        
        if not api_key_entry:
            logger.error("Chave de API inválida ou inativa")
            raise credentials_exception
            
        user = db.query(User).filter(User.id == api_key_entry.user_id).first()
        if not user or not user.is_active:
            logger.error(f"Usuário criador da chave {api_key_entry.id} está inativo ou inexistente")
            raise credentials_exception
            
        return user

    # Caso contrário, trata como Token JWT padrão
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.error("Token JWT missing 'sub'")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWT Decode Error: {e}")
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.error(f"User not found for email: {email}")
        raise credentials_exception
    
    if not user.is_active:
        logger.warning(f"Inactive user attempt: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua conta foi desativada pelo administrador.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user


from fastapi import Header
from typing import Optional, Union

def get_validated_client_id(
    x_client_id: Optional[Union[int, str]] = Header(None, alias="X-Client-ID"),
    current_user: User = Depends(get_current_user),
) -> int:

    """
    Valida se o X-Client-ID fornecido é acessível ao usuário autenticado atual.
    - Super Admin pode acessar qualquer client_id.
    - Demais usuários só podem acessar clientes vinculados à sua conta (accessible_clients).
    - Retorna 400 se o client_id estiver ausente e o usuário não tiver empresa padrão única.
    - Retorna 403 se o usuário tentar acessar uma empresa não autorizada (prevenção contra IDOR).
    """
    resolved_client_id: Optional[int] = None

    if x_client_id is not None:
        if isinstance(x_client_id, int):
            resolved_client_id = x_client_id
        else:
            raw_str = str(x_client_id).strip()
            if raw_str and raw_str.lower() not in ("none", "null", "undefined"):
                try:
                    resolved_client_id = int(raw_str)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Client ID inválido: '{raw_str}'")

    # Fallback seguro caso nenhum header válido tenha sido enviado
    if resolved_client_id is None:
        if current_user.role == "super_admin":
            if getattr(current_user, "client_id", None):
                resolved_client_id = current_user.client_id
            elif current_user.accessible_clients:
                resolved_client_id = current_user.accessible_clients[0].id
        else:
            allowed_ids = {c.id for c in (current_user.accessible_clients or [])}
            if getattr(current_user, "client_id", None) and current_user.client_id in allowed_ids:
                resolved_client_id = current_user.client_id
            elif len(allowed_ids) == 1:
                resolved_client_id = next(iter(allowed_ids))

    if resolved_client_id is None:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")

    if current_user.role == "super_admin":
        return resolved_client_id

    allowed_ids = {c.id for c in (current_user.accessible_clients or [])}
    if getattr(current_user, "client_id", None):
        allowed_ids.add(current_user.client_id)

    if resolved_client_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado ao cliente solicitado."
        )

    return resolved_client_id


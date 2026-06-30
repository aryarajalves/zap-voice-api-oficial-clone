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
from typing import Optional

async def get_validated_client_id(
    x_client_id: Optional[int] = Header(None),
    current_user: User = Depends(get_current_user),
) -> int:
    """
    Validates that the X-Client-ID header is accessible to the current user.
    super_admin can access any client. Other roles can only access their assigned clients.
    Raises 400 if header is missing, 403 if user is not authorized for that client.
    """
    if x_client_id is None:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")

    if current_user.role == "super_admin":
        return x_client_id

    allowed_ids = {c.id for c in current_user.accessible_clients}
    if x_client_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado ao cliente solicitado."
        )

    return x_client_id

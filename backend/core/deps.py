from fastapi import Depends, HTTPException, status
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

# Aponta para o endpoint de login. Como vamos montar o router de auth com prefixo /auth, 
# a URL relativa será "token" se o endpoint for /auth/token, ou /auth/token absoluto.
# Vamos assumir que a rota de login será POST /auth/token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from core.logger import logger
    # logger.debug(f"Authenticating token: {token[:10]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.error("Token payload missing 'sub'")
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

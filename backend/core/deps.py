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
    return user

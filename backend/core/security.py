from slowapi import Limiter
from slowapi.util import get_remote_address
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
import os

# Instância compartilhada do Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Auth Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "changeme_secret_key_12345")
if SECRET_KEY:
    SECRET_KEY = SECRET_KEY.strip('"').strip("'")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Verifica senha com suporte a bcrypt e SHA256 fallback"""
    
    # Debug: Print hashes for comparison
    import hashlib
    sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    try:
        bcrypt_match = pwd_context.verify(plain_password, hashed_password)
    except:
        bcrypt_match = False

    sha256_match = (sha256_hash == hashed_password)
    
    # print(f"DEBUG: Verifying Password")
    # print(f"   Input Plain: {plain_password}")
    # print(f"   Stored Hash: {hashed_password}")
    # print(f"   Generated SHA256: {sha256_hash}")
    # print(f"   Bcrypt Match: {bcrypt_match}")
    # print(f"   SHA256 Match: {sha256_match}")
    
    if bcrypt_match: return True
    if sha256_match: return True
    
    return False

def get_password_hash(password):
    """Gera hash com bcrypt ou SHA256 fallback"""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        # Fallback para SHA256
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

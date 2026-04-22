import os
import secrets
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt

logger = logging.getLogger("security")

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])

# ── Auth Configuration ────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "").strip('"').strip("'").strip()

if not SECRET_KEY:
    logger.warning("⚠️  SECRET_KEY não configurado — gerando chave temporária. Configure SECRET_KEY no .env para produção.")
    SECRET_KEY = secrets.token_urlsafe(64)
elif len(SECRET_KEY) < 32:
    raise ValueError(
        "SECRET_KEY deve ter no mínimo 32 caracteres. "
        "Gere uma chave segura com: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha usando bcrypt ou SHA256 legado."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        import hashlib
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """Gera hash bcrypt seguro."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

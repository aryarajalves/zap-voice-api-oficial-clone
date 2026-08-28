import os
import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from core.logger import setup_logger

logger = setup_logger("encryption")

_PREFIX = "enc:v1:"

def _get_fernet_instance() -> Fernet:
    """
    Obtém uma instância do Fernet configurada a partir de ENCRYPTION_KEY
    ou deriva uma chave simétrica determinística de 32 bytes a partir da SECRET_KEY.
    """
    env_key = os.getenv("ENCRYPTION_KEY", "").strip().strip('"').strip("'")
    
    if env_key:
        try:
            return Fernet(env_key.encode("utf-8"))
        except Exception as e:
            logger.warning(f"⚠️ [ENCRYPTION] ENCRYPTION_KEY inválida no .env ({e}). Utilizando derivação da SECRET_KEY.")

    # Derivação determinística e segura a partir da SECRET_KEY com salt de domínio
    secret = os.getenv("SECRET_KEY", "zapvoice_default_encryption_secret_key_32_bytes").strip().strip('"').strip("'")
    derived_hash = hashlib.sha256(f"zapvoice_symmetric_encryption_salt:{secret}".encode("utf-8")).digest()
    urlsafe_key = base64.urlsafe_b64encode(derived_hash)
    return Fernet(urlsafe_key)


def encrypt_token(plain_text: Optional[str]) -> Optional[str]:
    """
    Criptografa um token ou segredo sensível em repouso.
    Retorna o valor cifrado com o prefixo 'enc:v1:'.
    Se o valor já estiver cifrado ou for vazio/None, retorna-o inalterado.
    """
    if not plain_text or not isinstance(plain_text, str):
        return plain_text

    plain_text = plain_text.strip()
    if not plain_text:
        return plain_text

    if plain_text.startswith(_PREFIX):
        return plain_text

    try:
        fernet = _get_fernet_instance()
        encrypted_bytes = fernet.encrypt(plain_text.encode("utf-8"))
        return f"{_PREFIX}{encrypted_bytes.decode('utf-8')}"
    except Exception as e:
        logger.error(f"❌ [ENCRYPTION] Erro ao criptografar token: {e}")
        return plain_text


def decrypt_token(cipher_text: Optional[str]) -> Optional[str]:
    """
    Descriptografa um token em repouso.
    Se o valor estiver com prefixo 'enc:v1:', descriptografa via Fernet.
    Se o valor for texto puro legado (sem prefixo), retorna-o diretamente sem quebrar dados existentes.
    """
    if not cipher_text or not isinstance(cipher_text, str):
        return cipher_text

    cipher_text = cipher_text.strip()
    if not cipher_text:
        return cipher_text

    if not cipher_text.startswith(_PREFIX):
        # Valor legado em texto claro
        return cipher_text

    raw_payload = cipher_text[len(_PREFIX):]
    try:
        fernet = _get_fernet_instance()
        decrypted_bytes = fernet.decrypt(raw_payload.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        logger.error("❌ [ENCRYPTION] Token inválido ou chave de criptografia alterada.")
        return cipher_text
    except Exception as e:
        logger.error(f"❌ [ENCRYPTION] Erro ao descriptografar token: {e}")
        return cipher_text


SENSITIVE_KEY_NAMES = {
    "WA_ACCESS_TOKEN",
    "CHATWOOT_API_TOKEN",
    "MANYCHAT_API_KEY",
    "INSTAGRAM_ACCESS_TOKEN",
    "OPENAI_API_KEY",
    "WA_PIN",
    "RESEND_API_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "SMTP_PASSWORD",
    "S3_SECRET_KEY",
    "BACKBLAZE_S3_SECRET_KEY"
}

def is_sensitive_key(key: str) -> bool:
    """Verifica se uma chave de configuração é um segredo/token sensível."""
    if not key or not isinstance(key, str):
        return False
    key_upper = key.upper().strip()
    if key_upper in SENSITIVE_KEY_NAMES:
        return True
    return any(suffix in key_upper for suffix in ("_TOKEN", "_API_KEY", "_SECRET", "_PASSWORD", "_SECRET_KEY"))

import hmac
import hashlib
import time
from typing import Optional, Dict, Any
from core.logger import logger

def verify_hmac_sha256(payload_bytes: bytes, secret: str, signature: str) -> bool:
    """
    Valida assinatura HMAC-SHA256 de forma segura com tempo constante (timing attack safe).
    """
    if not secret:
        return True
    if not signature:
        return False
    try:
        clean_sig = signature.strip()
        if clean_sig.startswith('sha256='):
            clean_sig = clean_sig[7:]
        
        expected = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected.lower(), clean_sig.lower())
    except Exception as e:
        logger.error(f"Erro ao validar HMAC-SHA256: {e}")
        return False

def verify_meta_signature(payload_bytes: bytes, app_secret: str, signature_header: Optional[str]) -> bool:
    """
    Valida o cabecalho X-Hub-Signature-256 enviado pela Meta (WhatsApp Cloud API / Graph API).
    Se app_secret nao estiver configurado no servidor/cliente, permite o recebimento (retrocompatibilidade).
    Se configurado, exige a assinatura valida.
    """
    if not app_secret:
        return True
    if not signature_header:
        logger.warning("\u26a0 [META_SECURITY] Header X-Hub-Signature-256 ausente na requisicao da Meta.")
        return False
    
    is_valid = verify_hmac_sha256(payload_bytes, app_secret, signature_header)
    if not is_valid:
        logger.warning("\uf841 [META_SECURITY] Assinatura X-Hub-Signature-256 invalida!")
    return is_valid

def verify_hotmart_hottok(payload: Dict[str, Any], headers: Dict[str, Any], expected_hottok: Optional[str]) -> bool:
    """
    Valida o token hottok da Hotmart enviado no corpo do webhook ou nos headers (X-Hotmart-Hottok).
    """
    if not expected_hottok:
        return True
    
    received_token = None
    if isinstance(payload, dict):
        received_token = payload.get("hottok") or payload.get("token")
    
    if not received_token and headers:
        received_token = headers.get("x-hotmart-hottok") or headers.get("X-Hotmart-Hottok") or headers.get("hottok")
    
    if not received_token:
        logger.warning("\u26a0 [HOTMART_SECURITY] Token hottok ausente na requisicao.")
        return False
    
    return hmac.compare_digest(str(expected_hottok).strip(), str(received_token).strip())

def verify_kiwify_signature(payload_bytes: bytes, query_or_header_signature: Optional[str], secret_key: Optional[str]) -> bool:
    """
    Valida assinatura ou token de verificacao da Kiwify.
    """
    if not secret_key:
        return True
    if not query_or_header_signature:
        logger.warning("\u26a0 [KIWIFY_SECURITY] Assinatura/token da Kiwify ausente.")
        return False
    
    if hmac.compare_digest(str(secret_key).strip(), str(query_or_header_signature).strip()):
        return True
    
    return verify_hmac_sha256(payload_bytes, secret_key, query_or_header_signature)

def verify_stripe_signature(payload_bytes: bytes, signature_header: Optional[str], secret: Optional[str], tolerance: int = 300) -> bool:
    """
    Valida o cabecalho Stripe-Signature (formato: t=timestamp,v1=signature).
    """
    if not secret:
        return True
    if not signature_header:
        return False
    
    try:
        parts = {}
        for item in signature_header.split(','):
            if '=' in item:
                k, v = item.strip().split('=', 1)
                parts[k] = v
        
        timestamp = parts.get('t')
        v1_sig = parts.get('v1')
        
        if not timestamp or not v1_sig:
            return False
        
        current_ts = int(time.time())
        if abs(current_ts - int(timestamp)) > tolerance:
            logger.warning("\u26a0 [STRIPE_SECURITY] Timestamp do webhook expirado (Replay Attack Prevention).")
            return False
        
        signed_payload = f"{timestamp}.".encode('utf-8') + payload_bytes
        expected = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected.lower(), v1_sig.lower())
    except Exception as e:
        logger.error(f"Erro ao validar Stripe signature: e")
        return False

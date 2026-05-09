import re

def normalize_phone(phone: str) -> str:
    """Extrai apenas dígitos do telefone e aplica normalização básica."""
    if not phone:
        return ""
    clean = "".join(filter(str.isdigit, str(phone)))
    
    # Normalização BR: 55 + DDD + Número
    # Se começar com 55 e tiver mais de 13 dígitos, tenta ajustar
    if clean.startswith("55") and len(clean) > 13:
        clean = clean[-13:]
    elif len(clean) == 11 and clean.startswith("0"):
        clean = clean[1:]
        
    return clean

def get_phone_suffix(phone: str, length: int = 8) -> str:
    """Retorna o sufixo do telefone para comparações flexíveis."""
    clean = normalize_phone(phone)
    if not clean:
        return ""
    return clean[-length:] if len(clean) >= length else clean

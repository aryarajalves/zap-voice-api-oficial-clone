import re

def normalize_phone(phone: str) -> str:
    """Extrai apenas dígitos do telefone e aplica normalização básica com DDI 55 e DDD brasileiro."""
    if not phone:
        return ""
    clean = "".join(filter(str.isdigit, str(phone)))
    if not clean:
        return ""
    
    # Remove zeros à esquerda (ex: discagem com 0)
    clean = clean.lstrip("0")
    if not clean:
        return ""

    # Se tiver 10 ou 11 dígitos sem 55, e o DDD for brasileiro válido (11 a 99), adiciona 55
    if len(clean) in (10, 11) and not clean.startswith("55"):
        try:
            ddd = int(clean[:2])
            if 11 <= ddd <= 99:
                clean = f"55{clean}"
        except ValueError:
            pass

    # Normalização BR: 55 + DDD + Número
    # Se tem 55 + DDD + 8 dígitos (Total 12), adiciona o 9
    if clean.startswith("55") and len(clean) == 12:
        ddd = clean[2:4]
        number = clean[4:]
        # DDDs brasileiros (11 a 99)
        try:
            if 11 <= int(ddd) <= 99:
                clean = f"55{ddd}9{number}"
        except ValueError:
            pass
    
    # Se começar com 55 e tiver mais de 13 dígitos, tenta ajustar
    if clean.startswith("55") and len(clean) > 13:
        clean = clean[-13:]
        
    return clean

def get_phone_suffix(phone: str, length: int = 8) -> str:
    """Retorna o sufixo do telefone para comparações flexíveis."""
    clean = normalize_phone(phone)
    if not clean:
        return ""
    return clean[-length:] if len(clean) >= length else clean

def clean_phone_for_canonical(phone: str) -> str:
    """
    Higieniza dígitos de telefone tratando anomalias comuns:
    - Zeros à esquerda (discagem DDD)
    - Trailing zero em números de 14 dígitos vindos de webhooks (55 + DDD + 9 dígitos + 0)
    - Zero após o DDD (ex: 8109060057339 -> 819060057339)
    """
    if not phone:
        return ""
    digits = "".join(filter(str.isdigit, str(phone))).lstrip("0")
    if not digits:
        return ""
    
    # Caso 1: 14 dígitos começando com 55 e terminando com 0 (anomalia de webhook)
    if len(digits) == 14 and digits.startswith("55") and digits.endswith("0"):
        digits = digits[:-1]

    # Caso 2: 13 dígitos sem 55, com zero após o DDD (ex: 8109060057339 -> 819060057339)
    if len(digits) == 13 and not digits.startswith("55"):
        ddd = digits[:2]
        try:
            if 11 <= int(ddd) <= 99 and digits[2] == "0":
                digits = ddd + digits[3:]
        except ValueError:
            pass

    return digits

def get_canonical_phone_key(phone: str) -> str:
    """
    Retorna uma chave canônica única para agrupamento de duplicados telefônicos:
    Identifica se dois registros pertencem ao mesmo contato mesmo com variações de:
    - DDI 55 presente ou ausente
    - Zeros extras (antes ou depois do DDD, ou ao fim do número)
    - 8 ou 9 dígitos no celular
    Formato da chave: '55_{DDD}_{ULTIMOS_8_DIGITOS}'
    """
    digits = clean_phone_for_canonical(phone)
    if not digits:
        return ""
    
    # Com DDI 55
    if digits.startswith("55") and len(digits) >= 12:
        ddd = digits[2:4]
        suffix8 = digits[-8:]
        return f"55_{ddd}_{suffix8}"
    # Sem DDI 55, com DDD (10 ou 11 dígitos)
    elif len(digits) >= 10:
        ddd = digits[:2]
        suffix8 = digits[-8:]
        return f"55_{ddd}_{suffix8}"
    # Apenas sufixo local (mínimo 8 dígitos)
    elif len(digits) >= 8:
        return f"suffix_{digits[-8:]}"
    return digits


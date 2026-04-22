def normalize_phone(phone: str) -> str:
    """
    Normaliza telefones brasileiros para 12 dígitos (com o 9 extra).
    Ex: "55923099430" (11 dígitos) → "559293099430" (12 dígitos)
    Números de outros países ou já com 12+ dígitos são retornados como estão.
    """
    digits = "".join(filter(str.isdigit, str(phone)))

    # Brasil (começa com 55) com 11 dígitos: falta o 9 no celular
    # Formato esperado: 55 + 2 (DDD) + 8 (número antigo) = 11 dígitos
    # Correto:          55 + 2 (DDD) + 9 (prefixo) + 8 = 12 dígitos
    if digits.startswith("55") and len(digits) == 11:
        # Insere o 9 após o DDD (posição 4)
        digits = digits[:4] + "9" + digits[4:]

    return digits

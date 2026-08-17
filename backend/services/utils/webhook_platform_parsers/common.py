from typing import Optional


def get_doc_label(doc: Optional[str]) -> str:
    """Retorna o rótulo do documento (CPF, CNPJ ou Documento) com base no número de dígitos."""
    if not doc:
        return "Documento"
    doc_digits = "".join(filter(str.isdigit, str(doc)))
    if 10 <= len(doc_digits) <= 12:
        return "CPF"
    elif 13 <= len(doc_digits) <= 15:
        return "CNPJ"
    return "Documento"


def get_val(payload: dict, keys: list, default=None):
    """Navega recursivamente em um dicionário usando uma lista de chaves e retorna o valor ou padrão."""
    curr = payload
    for key in keys:
        if isinstance(curr, dict) and key in curr:
            curr = curr[key]
        else:
            return default
    if isinstance(curr, dict) and "value" in curr:
        return curr["value"]
    return curr

from sqlalchemy.orm import Session
from typing import Set, Optional
import models


def get_client_and_sibling_ids(db: Session, client_id: int) -> list:
    """Retorna o ID do cliente e de clientes irmãos do mesmo projeto (se houver)."""
    client_ids = [client_id]
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if client and client.project_id:
        siblings = db.query(models.Client.id).filter(models.Client.project_id == client.project_id).all()
        client_ids = [c.id for c in siblings]
    return client_ids


def is_contact_blocked(db: Session, client_id: int, phone: Optional[str]) -> bool:
    """
    Verifica se um telefone está na lista de contatos bloqueados (BlockedContact)
    do cliente ou de clientes do mesmo projeto, considerando os últimos 8 dígitos.
    """
    if not phone:
        return False
    
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    if len(clean_phone) < 8:
        return False
        
    suffix = clean_phone[-8:]
    client_ids = get_client_and_sibling_ids(db, client_id)

    exists = db.query(models.BlockedContact.id).filter(
        models.BlockedContact.client_id.in_(client_ids),
        models.BlockedContact.phone.like(f"%{suffix}")
    ).first()

    return exists is not None


def get_blocked_phone_suffixes(db: Session, client_id: int) -> Set[str]:
    """
    Retorna um conjunto (Set) com os últimos 8 dígitos de todos os telefones bloqueados
    para o cliente e seus clientes irmãos de projeto. Otimizado para verificações em lote.
    """
    client_ids = get_client_and_sibling_ids(db, client_id)
    blocked_entries = db.query(models.BlockedContact.phone).filter(
        models.BlockedContact.client_id.in_(client_ids)
    ).all()

    suffixes = set()
    for row in blocked_entries:
        if not row[0]:
            continue
        digits = "".join(filter(str.isdigit, str(row[0])))
        if len(digits) >= 8:
            suffixes.add(digits[-8:])
        elif digits:
            suffixes.add(digits)
    return suffixes


def is_phone_in_blocked_suffixes(phone: Optional[str], blocked_suffixes: Set[str]) -> bool:
    """Verifica rapidamente em memória se um telefone corresponde a algum sufixo bloqueado."""
    if not phone or not blocked_suffixes:
        return False
    digits = "".join(filter(str.isdigit, str(phone)))
    if len(digits) >= 8:
        return digits[-8:] in blocked_suffixes
    return digits in blocked_suffixes

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from ..common import get_client_id

logger = setup_logger("ChatRouter.Mention")

router = APIRouter()


@router.get("/chat/mention-contacts", summary="Listar contatos e conversas para o menu de menção (@)")
async def list_mention_contacts(
    search: Optional[str] = Query(None, description="Termo para filtrar por nome, telefone ou ID"),
    page: int = Query(1, ge=1, description="Número da página"),
    limit: int = Query(20, ge=1, le=100, description="Quantidade por página"),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna todos os contatos e conversas do cliente logado ordenados alfabeticamente (A-Z)
    com paginação de 20 em 20, normalização de telefones e sem duplicatas.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    def normalize_phone_key(phone_val: str) -> str:
        digits = ''.join(c for c in str(phone_val or '') if c.isdigit())
        if not digits:
            return ""
        if digits.startswith('55'):
            local = digits[2:]
            if len(local) == 10:  # DDD (2) + 8 dígitos -> adiciona o 9º dígito
                return '55' + local[:2] + '9' + local[2:]
            return digits
        elif len(digits) == 10:
            return '55' + digits[:2] + '9' + digits[2:]
        elif len(digits) == 11:
            return '55' + digits
        return digits

    sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "contatos_monitorados", client_id=client_id)
    safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')

    # Mapeamento de conversas existentes por telefone
    convo_map = {}
    existing_convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id
    ).all()

    for c in existing_convos:
        clean_p = (c.phone or '').replace('+', '').strip()
        if clean_p:
            convo_map[clean_p] = c
            norm_p = normalize_phone_key(clean_p)
            if norm_p:
                convo_map[norm_p] = c

    contacts_list = []
    seen_normalized_phones = set()

    # 1. Primeiro prioriza as conversas que já existem no chat
    for c in existing_convos:
        clean_p = (c.phone or '').replace('+', '').strip()
        norm_p = normalize_phone_key(clean_p)
        if norm_p and norm_p not in seen_normalized_phones:
            seen_normalized_phones.add(norm_p)
            contacts_list.append({
                "id": c.id,
                "convo_id": c.id,
                "contact_name": c.contact_name or c.phone or f"Conversa #{c.id}",
                "phone": clean_p or norm_p,
                "has_convo": True
            })

    # 2. Em seguida busca contatos adicionais da tabela sincronizada
    try:
        sql = text(f"SELECT phone, name FROM {safe_table}")
        rows = db.execute(sql).fetchall()
        for r in rows:
            p_raw = str(r[0] or '').replace('+', '').strip()
            name_raw = str(r[1] or '').strip()
            if not p_raw:
                continue

            norm_p = normalize_phone_key(p_raw)
            if not norm_p or norm_p in seen_normalized_phones:
                continue

            seen_normalized_phones.add(norm_p)

            convo = convo_map.get(norm_p) or convo_map.get(p_raw)
            c_id = convo.id if convo else None
            c_name = (convo.contact_name if convo and convo.contact_name else name_raw) or p_raw

            contacts_list.append({
                "id": c_id or p_raw,
                "convo_id": c_id,
                "contact_name": c_name,
                "phone": p_raw,
                "has_convo": bool(convo)
            })
    except Exception as e:
        logger.warning(f"Tabela {safe_table} não disponível para menções: {e}")

    # Filtragem por busca (nome ou telefone)
    if search and search.strip():
        term = search.strip().lower()
        contacts_list = [
            c for c in contacts_list
            if term in c["contact_name"].lower() or term in c["phone"].lower() or str(c["id"]) == term
        ]

    # Ordenação Alfabética Estrita (A-Z)
    contacts_list.sort(key=lambda x: (x["contact_name"] or "").strip().lower())

    total = len(contacts_list)
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    paginated_items = contacts_list[offset:offset + limit]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

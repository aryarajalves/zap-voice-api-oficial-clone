import re
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
import models


class BulkDeleteRequest(BaseModel):
    lead_ids: List[int]


def extract_ddi_ddd(raw_phone: Optional[str]):
    """
    Extrai DDI e DDD de um telefone (mesma heurística usada no frontend,
    ver frontend/src/utils/dddInfo.js -> extractDdiDdd).

    IMPORTANTE: só reconhece "tem DDI" quando o número realmente começa com
    "55" (praticamente 100% dos contatos desta base, já que vêm do WhatsApp
    Business API em formato E.164).

      - Começa com "55" e tem 12-13 dígitos => DDI "55", DDD = próximos 2 dígitos
      - 10 a 11 dígitos (sem DDI)            => DDD = 2 primeiros dígitos
      - Qualquer outro formato               => não reconhecido, não conta para os filtros

    Retorna (ddi, ddd), ambos podendo ser '' quando não aplicável.
    """
    digits = re.sub(r"\D", "", raw_phone or "")
    length = len(digits)
    if digits.startswith("55") and length in (12, 13):
        return "55", digits[2:4]
    if length in (10, 11):
        return "", digits[0:2]
    return "", ""


def _apply_common_lead_filters(query, search, event_type, product_name,
                                tag, tag_mode, is_locked, has_bsud, date_from, date_to,
                                imported_by_client_id, origin, exclude_tag=None):
    """Filtros compartilhados entre /leads, /leads/ddi-ddd-filters e afins."""
    if tag and not isinstance(tag, (list, str)):
        tag = None
    if exclude_tag and not isinstance(exclude_tag, (list, str)):
        exclude_tag = None

    if imported_by_client_id:
        query = query.filter(
            or_(
                models.WebhookLead.imported_by_client_id == imported_by_client_id,
                and_(models.WebhookLead.imported_by_client_id.is_(None), models.WebhookLead.client_id == imported_by_client_id)
            )
        )
    if origin == "manual":
        query = query.filter(models.WebhookLead.platform == "manual")
    elif origin == "manual_bulk":
        query = query.filter(models.WebhookLead.platform == "manual_bulk")
    elif origin == "webhook":
        query = query.filter(
            and_(
                models.WebhookLead.platform != "manual",
                models.WebhookLead.platform != "manual_bulk",
                models.WebhookLead.platform != "chatwoot_import"
            )
        )

    if search:
        # Se contiver quebras de linha (\n ou \r) ou vírgulas, trata como busca por lista de telefones/nomes em massa
        raw_items = [s.strip() for s in search.replace('\r', '').split('\n') if s.strip()]
        if len(raw_items) > 1 or any(',' in item for item in raw_items):
            multi_items = []
            for item in raw_items:
                parts = [p.strip() for p in item.split(',') if p.strip()]
                multi_items.extend(parts)
            
            if multi_items:
                conds = []
                for item in multi_items:
                    clean_digits = "".join(filter(str.isdigit, item))
                    if clean_digits and len(clean_digits) >= 8:
                        # Busca por sufixo de telefone para ignorar DDI/DDD se necessário
                        suf = clean_digits[-8:]
                        conds.append(models.WebhookLead.phone.like(f"%{suf}%"))
                    else:
                        conds.append(models.WebhookLead.name.ilike(f"%{item}%"))
                        conds.append(models.WebhookLead.phone.ilike(f"%{item}%"))
                        conds.append(models.WebhookLead.email.ilike(f"%{item}%"))
                query = query.filter(or_(*conds))
        else:
            clean_search = search.strip()
            clean_digits = "".join(filter(str.isdigit, clean_search))
            if clean_digits and len(clean_digits) >= 8:
                # Busca flexível por telefone (seja pelo número completo ou pelos últimos 8 dígitos)
                suf = clean_digits[-8:]
                query = query.filter(or_(
                    models.WebhookLead.name.ilike(f"%{clean_search}%"),
                    models.WebhookLead.phone.like(f"%{suf}%"),
                    models.WebhookLead.email.ilike(f"%{clean_search}%")
                ))
            else:
                query = query.filter(or_(
                    models.WebhookLead.name.ilike(f"%{clean_search}%"),
                    models.WebhookLead.phone.ilike(f"%{clean_search}%"),
                    models.WebhookLead.email.ilike(f"%{clean_search}%")
                ))

    if event_type:
        query = query.filter(models.WebhookLead.last_event_type == event_type)

    if product_name:
        query = query.filter(models.WebhookLead.product_name.ilike(f"%{product_name}%"))

    if tag:
        if isinstance(tag, str):
            tag = [tag]
        tags_filter = []
        for t in tag:
            if t:
                parts = [x.strip() for x in t.split(",") if x.strip()]
                tags_filter.extend(parts)
        if tags_filter:
            if tag_mode == "AND":
                query = query.filter(
                    and_(*(
                        func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                        for t in tags_filter
                    ))
                )
            else:
                query = query.filter(
                    or_(*(
                        func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                        for t in tags_filter
                    ))
                )

    if exclude_tag:
        if isinstance(exclude_tag, str):
            exclude_tag = [exclude_tag]
        exclude_tags_filter = []
        for t in exclude_tag:
            if t:
                parts = [x.strip() for x in t.split(",") if x.strip()]
                exclude_tags_filter.extend(parts)
        if exclude_tags_filter:
            # Contato não pode ter NENHUMA das etiquetas excluídas (nem outra que já não tenha tags)
            query = query.filter(
                and_(*(
                    or_(
                        models.WebhookLead.tags.is_(None),
                        ~func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                    )
                    for t in exclude_tags_filter
                ))
            )

    if is_locked == 'true':
        query = query.filter(models.WebhookLead.is_locked == True)
    elif is_locked == 'false':
        query = query.filter(or_(models.WebhookLead.is_locked == False, models.WebhookLead.is_locked.is_(None)))

    if has_bsud == 'true':
        query = query.filter(
            models.WebhookLead.bsud.isnot(None),
            models.WebhookLead.bsud != ''
        )
    elif has_bsud == 'false':
        query = query.filter(
            or_(models.WebhookLead.bsud.is_(None), models.WebhookLead.bsud == '')
        )

    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.WebhookLead.created_at >= dt_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_from inválido. Use YYYY-MM-DD.")

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1, seconds=-1)
            query = query.filter(models.WebhookLead.created_at <= dt_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_to inválido. Use YYYY-MM-DD.")

    return query


def _get_related_client_ids(db: Session, client_id: int):
    """Mesma lógica de herança usada em routers/blocked.py e routers/resting.py:
    se o cliente pertence a um projeto, bloqueio/repouso valem para todos os
    clientes-irmãos do projeto."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if client and client.project_id:
        siblings = db.query(models.Client.id).filter(models.Client.project_id == client.project_id).all()
        return [c[0] for c in siblings]
    return [client_id]


def _get_blocked_suffixes(db: Session, client_ids):
    """Sufixos (últimos 8 dígitos) dos telefones com bloqueio real (BlockedContact)."""
    entries = db.query(models.BlockedContact.phone).filter(models.BlockedContact.client_id.in_(client_ids)).all()
    return {p[0][-8:] for p in entries if p[0] and len(p[0]) >= 8}


def _get_resting_suffix_map(db: Session, client_ids):
    """Mapa sufixo -> expires_at dos telefones atualmente em repouso (RestingContact ainda não expirado)."""
    now = datetime.utcnow()
    entries = db.query(models.RestingContact.phone, models.RestingContact.expires_at).filter(
        models.RestingContact.client_id.in_(client_ids),
        models.RestingContact.expires_at > now
    ).all()
    result = {}
    for phone, expires_at in entries:
        if phone and len(phone) >= 8:
            suffix = phone[-8:]
            if suffix not in result or expires_at > result[suffix]:
                result[suffix] = expires_at
    return result


def _phone_suffix(phone: Optional[str]):
    digits = re.sub(r"\D", "", phone or "")
    return digits[-8:] if len(digits) >= 8 else digits

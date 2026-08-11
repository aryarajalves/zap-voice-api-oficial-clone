import os
import re
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, cast, String, Text, func
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

import models
import schemas
from core.deps import get_db, get_current_user
from core.permissions import require_premium, require_user, require_feature
from services.leads import upsert_webhook_lead
from core.logger import setup_logger

logger = setup_logger("LeadsRouter")

class BulkDeleteRequest(BaseModel):
    lead_ids: List[int]

router = APIRouter()

def extract_ddi_ddd(raw_phone: Optional[str]):
    """
    Extrai DDI e DDD de um telefone (mesma heurística usada no frontend,
    ver frontend/src/utils/dddInfo.js -> extractDdiDdd).

    IMPORTANTE: só reconhece "tem DDI" quando o número realmente começa com
    "55" (praticamente 100% dos contatos desta base, já que vêm do WhatsApp
    Business API em formato E.164). Antes, qualquer telefone com 12-13
    dígitos tinha seus 2 primeiros dígitos tratados como DDI "às cegas" —
    isso fazia números tipo "17988887777" com um dígito extra (ex: erro de
    importação) virarem um DDI fantasma "+17" (na verdade é o DDD de SP).

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
        search_filter = or_(
            models.WebhookLead.name.ilike(f"%{search}%"),
            models.WebhookLead.phone.ilike(f"%{search}%"),
            models.WebhookLead.email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

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


@router.delete("/leads/{lead_id}/template-history", summary="Remover histórico de 24h do último template do contato")
def reset_lead_template_history(
    lead_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Contato não encontrado.")

    clean_phone = re.sub(r"\D", "", lead.phone or "")
    template_name_to_clear = lead.last_template_name

    if clean_phone:
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

        # 1. Limpar ContactTemplateHistory
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            or_(
                models.ContactTemplateHistory.phone == clean_phone,
                models.ContactTemplateHistory.phone.like(f"%{suffix}")
            )
        ).delete(synchronize_session=False)

        # 2. Limpar MessageStatus — também verificado pelo is_template_sent_in_last_24h
        # Isso garante que o contato possa receber o template novamente imediatamente.
        if template_name_to_clear:
            db.query(models.MessageStatus).filter(
                models.MessageStatus.template_name == template_name_to_clear,
                or_(
                    models.MessageStatus.phone_number == clean_phone,
                    models.MessageStatus.phone_number.like(f"%{suffix}")
                )
            ).delete(synchronize_session=False)

    lead.last_template_name = None
    lead.last_template_dispatched_at = None
    db.commit()

    logger.info(f"🗑️ [Template History] Histórico do template '{template_name_to_clear}' removido para {clean_phone}. Contato liberado para novo disparo.")
    return {"success": True, "message": "Histórico do último template removido com sucesso. O contato pode receber o mesmo template novamente."}


@router.post("/leads", response_model=schemas.WebhookLead, summary="Criar ou atualizar lead manualmente")
def create_manual_lead(
    lead_in: schemas.WebhookLeadCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Cria um novo lead ou atualiza um existente com base no telefone.
    Limpa o telefone para conter apenas números.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Limpeza de telefone (apenas números)
    clean_phone = re.sub(r"\D", "", lead_in.phone)
    
    if not clean_phone or len(clean_phone) < 8:
        raise HTTPException(status_code=400, detail="Telefone inválido. Deve conter pelo menos 8 dígitos.")

    lead_data = {
        "phone": clean_phone,
        "name": lead_in.name,
        "email": lead_in.email,
        "event_type": "manual_creation"
    }

    # Reutiliza o serviço de upsert robusto
    lead = upsert_webhook_lead(
        db=db, 
        client_id=client_id, 
        platform="manual", 
        parsed_data=lead_data, 
        tag=lead_in.tags
    )
    
    if not lead:
        raise HTTPException(status_code=500, detail="Erro ao criar/atualizar lead.")
        
    return lead

def _fix_mojibake(text: str) -> str:
    """Corrige encoding quebrado: UTF-8 lido como Latin-1. Ex: 'RogÃ©rio' → 'Rogério'"""
    if not text or not isinstance(text, str):
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def _normalize_name(text: str) -> str:
    """Corrige encoding e aplica Title Case. Ex: 'ALBERTO levi' → 'Alberto Levi'"""
    if not text or not isinstance(text, str):
        return text
    return _fix_mojibake(text).strip().title()


@router.post("/leads/clean-corrupted-tags", summary="Sincronizar contatos: corrigir nomes e tags")
def clean_corrupted_tags(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Sincroniza todos os contatos do cliente:
    - Corrige encoding dos nomes (mojibake) e aplica Title Case
    - Remove tags corrompidas (barras, aspas, JSON malformado)
    - Unifica contatos duplicados com o mesmo telefone em um único registro
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == client_id
    ).all()

    tags_removed = 0
    names_fixed = 0
    leads_affected = 0
    leads_merged = 0

    from collections import defaultdict
    phone_groups = defaultdict(list)

    # 1. Agrupar leads por telefone normalizado
    for lead in leads:
        if lead.phone:
            clean_p = re.sub(r"\D", "", lead.phone)
            if len(clean_p) >= 8:
                phone_groups[clean_p].append(lead)

    # 2. Mesclar e remover duplicados
    for clean_phone, group in phone_groups.items():
        if len(group) > 1:
            # Ordena por ID ascendente para obter o principal (mais antigo)
            sorted_group = sorted(group, key=lambda x: x.id)
            principal = sorted_group[0]
            duplicados = sorted_group[1:]

            principal_changed = False

            # --- Nome ---
            for dup in duplicados:
                if dup.name:
                    if not principal.name or len(dup.name) > len(principal.name):
                        principal.name = dup.name
                        principal_changed = True

            # --- E-mail ---
            if not principal.email:
                for dup in duplicados:
                    if dup.email:
                        principal.email = dup.email
                        principal_changed = True
                        break

            # --- BSUD ---
            if not principal.bsud:
                for dup in duplicados:
                    if dup.bsud:
                        principal.bsud = dup.bsud
                        principal_changed = True
                        break

            # --- Metadados de Venda ---
            if not principal.product_name:
                for dup in duplicados:
                    if dup.product_name:
                        principal.product_name = dup.product_name
                        principal_changed = True
                        break
            if not principal.platform:
                for dup in duplicados:
                    if dup.platform:
                        principal.platform = dup.platform
                        principal_changed = True
                        break
            if not principal.payment_method:
                for dup in duplicados:
                    if dup.payment_method:
                        principal.payment_method = dup.payment_method
                        principal_changed = True
                        break
            if not principal.price:
                for dup in duplicados:
                    if dup.price:
                        principal.price = dup.price
                        principal_changed = True
                        break

            # --- Chatwoot e Projetos ---
            if not principal.chatwoot_conversation_id:
                for dup in duplicados:
                    if dup.chatwoot_conversation_id:
                        principal.chatwoot_conversation_id = dup.chatwoot_conversation_id
                        principal_changed = True
                        break
            if not principal.chatwoot_account_id:
                for dup in duplicados:
                    if dup.chatwoot_account_id:
                        principal.chatwoot_account_id = dup.chatwoot_account_id
                        principal_changed = True
                        break
            if not principal.chatwoot_inbox_id:
                for dup in duplicados:
                    if dup.chatwoot_inbox_id:
                        principal.chatwoot_inbox_id = dup.chatwoot_inbox_id
                        principal_changed = True
                        break
            if not principal.project_id:
                for dup in duplicados:
                    if dup.project_id:
                        principal.project_id = dup.project_id
                        principal_changed = True
                        break
            if not principal.imported_by_client_id:
                for dup in duplicados:
                    if dup.imported_by_client_id:
                        principal.imported_by_client_id = dup.imported_by_client_id
                        principal_changed = True
                        break

            # --- total_events ---
            for dup in duplicados:
                principal.total_events = (principal.total_events or 1) + (dup.total_events or 1)
                principal_changed = True

            # --- variables ---
            if not isinstance(principal.variables, dict):
                principal.variables = {}
            merged_vars = dict(principal.variables or {})
            vars_changed = False
            for dup in duplicados:
                if isinstance(dup.variables, dict) and dup.variables:
                    merged_vars.update(dup.variables)
                    vars_changed = True
            if vars_changed:
                principal.variables = merged_vars
                principal_changed = True

            # --- last_event_at / last_event_type ---
            most_recent = principal
            for dup in duplicados:
                if dup.last_event_at and (not most_recent.last_event_at or dup.last_event_at > most_recent.last_event_at):
                    most_recent = dup
            if most_recent != principal:
                principal.last_event_at = most_recent.last_event_at
                principal.last_event_type = most_recent.last_event_type
                principal_changed = True

            # --- Tags (Mesclagem e limpeza) ---
            all_tags = []
            if principal.tags:
                all_tags.extend([t.strip() for t in principal.tags.split(',') if t.strip()])
            for dup in duplicados:
                if dup.tags:
                    all_tags.extend([t.strip() for t in dup.tags.split(',') if t.strip()])

            unique_tags = []
            for t in all_tags:
                if t not in unique_tags:
                    unique_tags.append(t)

            clean_tags = [t for t in unique_tags if re.match(r'^[\w\s\-]+$', t, re.UNICODE)]
            new_tags_str = ', '.join(clean_tags) if clean_tags else None
            
            if new_tags_str != principal.tags:
                principal.tags = new_tags_str
                principal_changed = True

            if principal_changed:
                leads_affected += 1

            # --- Remover os duplicados do banco ---
            for dup in duplicados:
                db.delete(dup)
                leads_merged += 1

        else:
            # Processa normalização simples para contatos únicos
            lead = group[0]
            changed = False
            if lead.name:
                normalized = _normalize_name(lead.name)
                if normalized != lead.name:
                    lead.name = normalized
                    names_fixed += 1
                    changed = True

            if lead.tags:
                raw_tags = [t.strip() for t in lead.tags.split(',') if t.strip()]
                clean_tags = [t for t in raw_tags if re.match(r'^[\w\s\-]+$', t, re.UNICODE)]
                removed = len(raw_tags) - len(clean_tags)
                if removed > 0:
                    lead.tags = ', '.join(clean_tags) if clean_tags else None
                    tags_removed += removed
                    changed = True

            if changed:
                leads_affected += 1

    db.commit()
    
    # Mensagem informativa enriquecida
    msg_detail = f"Sincronização concluída. "
    if leads_merged > 0:
        msg_detail += f"{leads_merged} contato(s) duplicado(s) unificado(s). "
    msg_detail += f"{names_fixed} nome(s) corrigido(s) e {tags_removed} tag(s) limpa(s)."

    return {
        "status": "success",
        "leads_affected": leads_affected,
        "names_fixed": names_fixed,
        "tags_removed": tags_removed,
        "leads_merged": leads_merged,
        "message": msg_detail
    }

@router.get("/leads", response_model=schemas.WebhookLeadListResponse, summary="Listar Leads de Webhooks")
def list_leads(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    product_name: Optional[str] = None,
    tag: Optional[List[str]] = Query(None),
    tag_mode: Optional[str] = "OR",
    exclude_tag: Optional[List[str]] = Query(None),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    imported_by_client_id: Optional[int] = None,
    origin: Optional[str] = None,
    is_locked: Optional[str] = None,  # 'true' | 'false' | None (todos)
    has_bsud: Optional[str] = None,  # 'true' | 'false' | None (todos) — filtra contatos com número BSUD de fallback disponível
    filter_ddi: Optional[str] = None,
    filter_ddd: Optional[str] = None,
    block_status: Optional[str] = None,  # 'blocked' (bloqueio real) | 'resting' (repouso temporário) | None (todos)
    has_appointment: Optional[str] = None,  # 'true' | 'false' | None (todos)
    appointment_status: Optional[str] = None,  # 'pending' | 'occurred' | None (todos)
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("leads"))
):
    """
    Retorna a lista de leads capturados via webhook, com filtros e busca.
    Filtros de data (date_from, date_to) aceitam formato ISO 8601 (YYYY-MM-DD).
    'exclude_tag' remove da lista qualquer contato que possua au menos uma das
    etiquetas informadas (mesmo que também possua etiquetas de 'tag').
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    # Verificar se o cliente tem um projeto associado
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    query = _apply_common_lead_filters(
        query, search, event_type, product_name, tag, tag_mode,
        is_locked, has_bsud, date_from, date_to, imported_by_client_id, origin,
        exclude_tag=exclude_tag
    )

    # Filtro de Agendamentos
    if has_appointment == 'true':
        query = query.filter(models.WebhookLead.event_datetime.isnot(None))
        if appointment_status == 'pending':
            query = query.filter(models.WebhookLead.event_datetime >= datetime.utcnow())
        elif appointment_status == 'occurred':
            query = query.filter(models.WebhookLead.event_datetime < datetime.utcnow())
    elif has_appointment == 'false':
        query = query.filter(models.WebhookLead.event_datetime.is_(None))

    # Filtro por DDI/DDD do telefone
    if filter_ddi:
        clean_ddi = re.sub(r"\D", "", filter_ddi)
        if clean_ddi:
            query = query.filter(models.WebhookLead.phone.like(f"{clean_ddi}%"))

    if filter_ddd:
        clean_ddd = re.sub(r"\D", "", filter_ddd)
        if clean_ddd:
            query = query.filter(or_(
                models.WebhookLead.phone.like(f"55{clean_ddd}%"),
                models.WebhookLead.phone.like(f"{clean_ddd}%")
            ))

    # Bloqueio real (BlockedContact) e repouso temporário (RestingContact) —
    # calculados uma única vez aqui para reaproveitar tanto no filtro quanto
    # no enriquecimento dos itens retornados (evita duas consultas iguais).
    related_client_ids = _get_related_client_ids(db, client_id)
    blocked_suffixes = _get_blocked_suffixes(db, related_client_ids)
    resting_suffix_map = _get_resting_suffix_map(db, related_client_ids)

    if block_status == 'blocked':
        if blocked_suffixes:
            query = query.filter(or_(*(models.WebhookLead.phone.like(f"%{s}") for s in blocked_suffixes)))
        else:
            query = query.filter(models.WebhookLead.id == -1)
    elif block_status == 'resting':
        if resting_suffix_map:
            query = query.filter(or_(*(models.WebhookLead.phone.like(f"%{s}") for s in resting_suffix_map.keys())))
        else:
            query = query.filter(models.WebhookLead.id == -1)

    total = query.count()
    items = query.order_by(desc(models.WebhookLead.updated_at)).offset(skip).limit(limit).all()

    # Dynamic Redirection Logic
    try:
        chatwoot_url_config = db.query(models.AppConfig).filter(
            models.AppConfig.client_id == client_id,
            models.AppConfig.key == "CHATWOOT_API_URL"
        ).first()
        raw_url = chatwoot_url_config.value if chatwoot_url_config and chatwoot_url_config.value else None
    except Exception as e:
        logger.error(f"Erro ao buscar CHATWOOT_API_URL do AppConfig: {e}")
        raw_url = None

    if not raw_url:
        raw_url = os.getenv("CHATWOOT_API_URL", "https://app.chatwoot.com")

    # Extrair apenas o host base (remover /api/v1 ou /api se houver)
    base_url = re.sub(r"/api(/v\d+)?/?$", "", raw_url.strip().rstrip("/"))

    for item in items:
        if item.chatwoot_conversation_id and item.chatwoot_account_id:
            item.chatwoot_url = f"{base_url}/app/accounts/{item.chatwoot_account_id}/conversations/{item.chatwoot_conversation_id}"
        else:
            item.chatwoot_url = None
        
        # Enriquecer o nome do cliente criador do lead
        if item.imported_by_client:
            item.imported_by_name = item.imported_by_client.name
        elif item.client:
            item.imported_by_name = item.client.name
        else:
            item.imported_by_name = None

        # Enriquecer com status de bloqueio real e repouso temporário
        suffix = _phone_suffix(item.phone)
        item.is_really_blocked = suffix in blocked_suffixes
        item.resting_expires_at = resting_suffix_map.get(suffix)

        # Enriquecer com status de disparo de lembrete de agendamento se aplicável
        if item.event_datetime:
            latest_status = db.query(models.MessageStatus).filter(
                models.MessageStatus.phone_number == item.phone,
                models.MessageStatus.message_type == 'TEMPLATE'
            ).order_by(desc(models.MessageStatus.id)).first()
            if latest_status:
                item.reminder_dispatch_status = latest_status.status
                item.reminder_dispatch_interaction = latest_status.is_interaction
                item.reminder_dispatch_failure_reason = latest_status.failure_reason
            else:
                item.reminder_dispatch_status = None
                item.reminder_dispatch_interaction = False
                item.reminder_dispatch_failure_reason = None
        else:
            item.reminder_dispatch_status = None
            item.reminder_dispatch_interaction = False
            item.reminder_dispatch_failure_reason = None

    return {
        "items": items,
        "total": total
    }

@router.get("/leads/ddi-ddd-filters", summary="Obter DDIs/DDDs presentes nos leads filtrados")
def get_lead_ddi_ddd_filters(
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    product_name: Optional[str] = None,
    tag: Optional[List[str]] = Query(None),
    tag_mode: Optional[str] = "OR",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    imported_by_client_id: Optional[int] = None,
    origin: Optional[str] = None,
    is_locked: Optional[str] = None,
    has_bsud: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("leads"))
):
    """
    Calcula, a partir dos MESMOS filtros aplicados na listagem de /leads (exceto
    DDI/DDD, que é o que estamos calculando aqui), quais DDIs e DDDs realmente
    existem entre os contatos resultantes — para popular os dropdowns do
    Frontend de forma dinâmica, nunca com uma lista fixa de códigos.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead.phone).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead.phone).filter(models.WebhookLead.client_id == client_id)

    query = _apply_common_lead_filters(
        query, search, event_type, product_name, tag, tag_mode,
        is_locked, has_bsud, date_from, date_to, imported_by_client_id, origin
    )

    related_client_ids = _get_related_client_ids(db, client_id)
    blocked_suffixes = _get_blocked_suffixes(db, related_client_ids)
    resting_suffix_map = _get_resting_suffix_map(db, related_client_ids)

    ddis = set()
    ddds = set()
    has_blocked = False
    has_resting = False
    for (phone,) in query.all():
        ddi, ddd = extract_ddi_ddd(phone)
        if ddi:
            ddis.add(ddi)
        if ddd:
            ddds.add(ddd)

        suffix = _phone_suffix(phone)
        if suffix in blocked_suffixes:
            has_blocked = True
        if suffix in resting_suffix_map:
            has_resting = True

    sorted_ddis = sorted(ddis, key=lambda d: (d != "55", d))
    sorted_ddds = sorted(ddds, key=lambda d: int(d))

    return {
        "ddis": sorted_ddis,
        "ddds": sorted_ddds,
        "has_blocked": has_blocked,
        "has_resting": has_resting,
    }

@router.get("/leads/filters", summary="Obter valores únicos para filtros")
def get_lead_filters(
    only_leads: bool = False,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Retorna os tipos de eventos e nomes de produtos únicos para preencher os filtros do Frontend.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Verificar se o cliente tem um projeto associado
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        filter_clause = models.WebhookLead.project_id == proj_id
    else:
        filter_clause = models.WebhookLead.client_id == client_id

    event_types = db.query(models.WebhookLead.last_event_type)\
        .filter(filter_clause)\
        .distinct().all()
    
    product_names = db.query(models.WebhookLead.product_name)\
        .filter(filter_clause)\
        .distinct().all()
    
    # Get all tags, split them and return unique sorted list
    all_tags_raw = db.query(models.WebhookLead.tags)\
        .filter(filter_clause, models.WebhookLead.tags != None)\
        .distinct().all()
    
    unique_tags = set()
    for row in all_tags_raw:
        if row[0]:
            parts = [t.strip() for t in row[0].split(',') if t.strip()]
            for p in parts:
                unique_tags.add(p)

    # Buscar também etiquetas internas mapeadas nas configurações de integração do cliente (a menos que only_leads seja True)
    if not only_leads:
        try:
            mapping_tags_raw = db.query(models.WebhookEventMapping.internal_tags)\
                .join(models.WebhookIntegration, models.WebhookEventMapping.integration_id == models.WebhookIntegration.id)\
                .filter(models.WebhookIntegration.client_id == client_id, models.WebhookEventMapping.internal_tags != None)\
                .distinct().all()
            for row in mapping_tags_raw:
                if row[0]:
                    parts = [t.strip() for t in row[0].split(',') if t.strip()]
                    for p in parts:
                        unique_tags.add(p)
        except Exception as e:
            logger.error(f"Erro ao buscar tags mapeadas em get_lead_filters: {e}")

    # Buscar a lista de clientes únicos que importaram ou criaram esses leads para preencher o filtro do frontend
    imported_by_clients = []
    try:
        # Clientes baseados no imported_by_client_id
        imported_by_ids = db.query(models.WebhookLead.imported_by_client_id)\
            .filter(filter_clause, models.WebhookLead.imported_by_client_id.isnot(None))\
            .distinct().all()
        ids = [c[0] for c in imported_by_ids]
        
        # Também buscar o client_id principal dos leads caso imported_by_client_id seja nulo
        main_client_ids = db.query(models.WebhookLead.client_id)\
            .filter(filter_clause, models.WebhookLead.imported_by_client_id.is_(None))\
            .distinct().all()
        for mc in main_client_ids:
            if mc[0] not in ids:
                ids.append(mc[0])

        if ids:
            clients = db.query(models.Client.id, models.Client.name)\
                .filter(models.Client.id.in_(ids)).all()
            imported_by_clients = [{"id": c.id, "name": c.name} for c in clients]
    except Exception as e:
        logger.error(f"Erro ao buscar clientes criadores de leads: {e}")

    return {
        "event_types": [e[0] for e in event_types if e[0]],
        "product_names": [p[0] for p in product_names if p[0]],
        "tags": sorted(list(unique_tags)),
        "imported_by_clients": imported_by_clients
    }

@router.get("/leads/custom-variables", summary="Obter chaves de variáveis customizadas dos contatos")
def get_lead_custom_variables(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Retorna a lista de chaves únicas de variáveis customizadas armazenadas na coluna
    'variables' de 'webhook_leads' para o client_id do usuário.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    logger.info(f"🔍 Buscando chaves de variáveis customizadas para o cliente {client_id}")
    
    try:
        leads = db.query(models.WebhookLead.variables).filter(
            models.WebhookLead.client_id == client_id,
            models.WebhookLead.variables.isnot(None)
        ).all()
        
        unique_keys = set()
        for row in leads:
            vars_dict = row[0]
            if isinstance(vars_dict, dict):
                for k in vars_dict.keys():
                    unique_keys.add(k)
                    
        result = sorted(list(unique_keys))
        logger.info(f"✅ Encontradas {len(result)} chaves de variáveis customizadas para o cliente {client_id}: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ Erro ao buscar chaves de variáveis customizadas: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar variáveis customizadas.")

@router.get("/leads/export", summary="Exportar Leads para CSV")
def export_leads_csv(
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    product_name: Optional[str] = None,
    tag: Optional[List[str]] = Query(None),
    ids: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    origin: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Gera um arquivo CSV com os leads filtrados.
    Se 'ids' for informado (ex: ids=1,2,3), exporta apenas esses leads.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    # Se IDs específicos forem passados, ignora os demais filtros
    if ids:
        id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
        if id_list:
            query = query.filter(models.WebhookLead.id.in_(id_list))
    else:
        if search:
            search_filter = or_(
                models.WebhookLead.name.ilike(f"%{search}%"),
                models.WebhookLead.phone.ilike(f"%{search}%"),
                models.WebhookLead.email.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        if event_type:
            query = query.filter(models.WebhookLead.last_event_type == event_type)

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
                query = query.filter(
                    or_(*(
                        func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                        for t in tags_filter
                    ))
                )

        # Filtro de data (exportação também respeita o range selecionado)
        if date_from:
            try:
                dt_from = datetime.strptime(date_from, "%Y-%m-%d")
                query = query.filter(models.WebhookLead.created_at >= dt_from)
            except ValueError:
                pass

        if date_to:
            try:
                dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1, seconds=-1)
                query = query.filter(models.WebhookLead.created_at <= dt_to)
            except ValueError:
                pass

    leads = query.order_by(desc(models.WebhookLead.updated_at)).all()

    output = io.StringIO()
    output.write('\ufeff') # Add BOM for Excel compatibility
    writer = csv.writer(output, delimiter=';')
    writer.writerow([
        'Nome', 'Telefone', 'Email', 'Etiquetas', 'Ultimo Evento', 'Data Evento', 
        'Produto', 'Plataforma', 'Metodo Pagamento', 'Preço', 'Total Eventos'
    ])

    for lead in leads:
        status_formatted = lead.last_event_type.replace('_', ' ').title() if lead.last_event_type else '-'
        writer.writerow([
            lead.name or '-',
            lead.phone or '-',
            lead.email or '-',
            lead.tags or '-',
            status_formatted,
            lead.last_event_at.strftime("%d/%m/%Y %H:%M:%S") if lead.last_event_at else '-',
            lead.product_name or '-',
            lead.platform or '-',
            lead.payment_method or '-',
            lead.price or '-',
            lead.total_events or 1
        ])

    output.seek(0)
    
    filename = f"leads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _delete_lead_and_relations(db: Session, lead: models.WebhookLead, client_id: int):
    """
    Deleta o lead e todo o seu histórico/agendamentos atrelados.
    Também remove restrições de 24h de template para que o número possa
    receber o mesmo template novamente caso seja re-adicionado.
    """
    if lead.phone:
        clean_phone = re.sub(r"\D", "", lead.phone)
        suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

        # 1. Deletar Scheduled Triggers com esse telefone (e seus registros dependentes de message_status)
        trigger_ids = [t[0] for t in db.query(models.ScheduledTrigger.id).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.contact_phone == lead.phone
        ).all()]
        
        if trigger_ids:
            db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id.in_(trigger_ids)
            ).delete(synchronize_session=False)

            db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.id.in_(trigger_ids)
            ).delete(synchronize_session=False)

        # 2. Deletar Histórico que contenha esse telefone
        integrations_subquery = db.query(models.WebhookIntegration.id).filter(
            models.WebhookIntegration.client_id == client_id
        ).subquery()

        histories = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.integration_id.in_(integrations_subquery),
            cast(models.WebhookHistory.processed_data, Text).like(f"%{lead.phone}%")
        ).all()
        for h in histories:
            db.delete(h)

        # 3. Limpar restrição de 24h: ContactTemplateHistory e MessageStatus de template
        # Isso garante que se o contato for re-adicionado, ele não fique bloqueado
        # pelo histórico de disparos do contato deletado.
        db.query(models.ContactTemplateHistory).filter(
            models.ContactTemplateHistory.client_id == client_id,
            or_(
                models.ContactTemplateHistory.phone == clean_phone,
                models.ContactTemplateHistory.phone.like(f"%{suffix}")
            )
        ).delete(synchronize_session=False)

        db.query(models.MessageStatus).filter(
            models.MessageStatus.template_name.isnot(None),
            or_(
                models.MessageStatus.phone_number == clean_phone,
                models.MessageStatus.phone_number.like(f"%{suffix}")
            ),
            models.MessageStatus.trigger_id.is_(None)  # apenas os sem trigger (já limpos acima)
        ).delete(synchronize_session=False)

        logger.info(f"🗑️ [Delete Lead] Restrições de 24h de template removidas para {clean_phone} junto com o lead.")

    # 4. Deletar Lead
    db.delete(lead)


@router.delete("/leads/{lead_id}", summary="Deletar um lead específico")
def delete_lead(
    lead_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    if getattr(lead, 'is_locked', False):
        raise HTTPException(status_code=403, detail="Este contato está protegido e não pode ser excluído.")

    _delete_lead_and_relations(db, lead, client_id)
    db.commit()
    return {"status": "success", "message": "Lead e vínculos removidos."}

@router.put("/leads/{lead_id}", response_model=schemas.WebhookLead, summary="Atualizar um lead específico")
def update_lead(
    lead_id: int,
    lead_in: schemas.WebhookLeadUpdate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    update_data = lead_in.dict(exclude_unset=True)
    
    # Limpeza de telefone se fornecido na atualização
    if "phone" in update_data and update_data["phone"]:
        update_data["phone"] = re.sub(r"\D", "", update_data["phone"])
        if len(update_data["phone"]) < 8:
             raise HTTPException(status_code=400, detail="Telefone inválido para atualização.")

    # Se a data de agendamento for alterada, resetamos a flag do lembrete
    if "event_datetime" in update_data:
        new_dt = update_data["event_datetime"]
        # Certifica-se de comparar objetos datetime cientes/ingênuos de fuso horário adequadamente
        if new_dt != lead.event_datetime:
            lead.google_calendar_reminder_sent = False

    for field, value in update_data.items():
        setattr(lead, field, value)

    lead.updated_at = datetime.now()
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead

@router.post("/leads/bulk-delete", summary="Deletar múltiplos leads")
def bulk_delete_leads(
    request: BulkDeleteRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    deleted_count = 0
    skipped_locked = 0
    for lead in leads:
        if getattr(lead, 'is_locked', False):
            skipped_locked += 1
            continue
        _delete_lead_and_relations(db, lead, client_id)
        deleted_count += 1

    db.commit()
    msg = f"{deleted_count} lead(s) excluído(s)."
    if skipped_locked:
        msg += f" {skipped_locked} ignorado(s) por estarem protegidos."
    return {"status": "success", "deleted_count": deleted_count, "skipped_locked": skipped_locked, "message": msg}

class BulkDeleteAllRequest(BaseModel):
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None


@router.post("/leads/bulk-delete-all", summary="Deletar todos os leads dos filtros ativos")
def bulk_delete_all_leads(
    request: BulkDeleteAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Deleta TODOS os leads que correspondem aos filtros informados (exceto protegidos).
    Usado quando o usuário seleciona 'Todos os contatos de todas as páginas'.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    if request.imported_by_client_id:
        query = query.filter(
            or_(
                models.WebhookLead.imported_by_client_id == request.imported_by_client_id,
                and_(models.WebhookLead.imported_by_client_id.is_(None), models.WebhookLead.client_id == request.imported_by_client_id)
            )
        )
    if request.origin == "manual":
        query = query.filter(models.WebhookLead.platform == "manual")
    elif request.origin == "manual_bulk":
        query = query.filter(models.WebhookLead.platform == "manual_bulk")
    elif request.origin == "webhook":
        query = query.filter(and_(
            models.WebhookLead.platform != "manual",
            models.WebhookLead.platform != "manual_bulk",
            models.WebhookLead.platform != "chatwoot_import"
        ))

    if request.search:
        query = query.filter(or_(
            models.WebhookLead.name.ilike(f"%{request.search}%"),
            models.WebhookLead.phone.ilike(f"%{request.search}%"),
            models.WebhookLead.email.ilike(f"%{request.search}%")
        ))

    if request.event_type:
        query = query.filter(models.WebhookLead.last_event_type == request.event_type)

    if request.tag:
        tags_filter = [x.strip() for t in request.tag for x in t.split(",") if x.strip()]
        if tags_filter:
            query = query.filter(
                or_(*(
                    func.concat(',', func.replace(func.coalesce(models.WebhookLead.tags, ''), ', ', ','), ',').ilike(f"%,{t},%")
                    for t in tags_filter
                ))
            )

    if request.date_from:
        try:
            dt_from = datetime.strptime(request.date_from, "%Y-%m-%d")
            query = query.filter(models.WebhookLead.created_at >= dt_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_from inválido.")

    if request.date_to:
        try:
            dt_to = datetime.strptime(request.date_to, "%Y-%m-%d") + timedelta(days=1, seconds=-1)
            query = query.filter(models.WebhookLead.created_at <= dt_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_to inválido.")

    # Separar em deletáveis e protegidos
    all_leads = query.all()
    deletable = [l for l in all_leads if not getattr(l, 'is_locked', False)]
    skipped_locked = len(all_leads) - len(deletable)

    if not deletable:
        return {"status": "success", "deleted_count": 0, "skipped_locked": skipped_locked, "message": f"Nenhum contato deletável. {skipped_locked} protegido(s)."}

    deletable_ids = [l.id for l in deletable]
    phones = list({l.phone for l in deletable if l.phone})

    # 1. Deletar ScheduledTriggers em batch (por lote de 500 telefones)
    #    IMPORTANTE: message_status.trigger_id -> scheduled_triggers.id não tem
    #    ON DELETE CASCADE no banco (só no modelo ORM). É preciso apagar os
    #    MessageStatus antes, senão o DELETE do trigger quebra por violação de
    #    FK (era essa a causa do "Erro ao processar exclusão").
    BATCH = 500
    for i in range(0, len(phones), BATCH):
        batch_phones = phones[i:i + BATCH]
        trigger_ids = [t[0] for t in db.query(models.ScheduledTrigger.id).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.contact_phone.in_(batch_phones)
        ).all()]

        if trigger_ids:
            db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id.in_(trigger_ids)
            ).delete(synchronize_session=False)

            db.query(models.ScheduledTrigger).filter(
                models.ScheduledTrigger.id.in_(trigger_ids)
            ).delete(synchronize_session=False)

    # 2. Deletar os leads em batch (por lote de 1000 IDs)
    for i in range(0, len(deletable_ids), 1000):
        batch_ids = deletable_ids[i:i + 1000]
        db.query(models.WebhookLead).filter(
            models.WebhookLead.id.in_(batch_ids)
        ).delete(synchronize_session=False)

    db.commit()
    deleted_count = len(deletable_ids)
    msg = f"{deleted_count} contato(s) excluído(s)."
    if skipped_locked:
        msg += f" {skipped_locked} ignorado(s) por estarem protegidos."
    return {"status": "success", "deleted_count": deleted_count, "skipped_locked": skipped_locked, "message": msg}


def _add_tags_to_lead(lead, new_tags_str: str, db: Optional[Session] = None) -> bool:
    """Adiciona etiqueta(s) ao campo 'tags' do lead sem apagar as existentes.
    Aceita múltiplas etiquetas separadas por vírgula. Retorna True se algo mudou."""
    existing = [t.strip() for t in (lead.tags or '').split(',') if t.strip()]
    new_tags = [t.strip() for t in (new_tags_str or '').split(',') if t.strip()]
    changed = False
    for t in new_tags:
        if t not in existing:
            existing.append(t)
            changed = True
    if changed:
        from sqlalchemy.orm.attributes import flag_modified
        lead.tags = ', '.join(existing)
        lead.updated_at = datetime.now()
        flag_modified(lead, "tags")

        if db and lead.phone and lead.client_id:
            clean_phone = str(lead.phone).replace('+', '').strip()
            target_phones = [lead.phone, clean_phone, f"+{clean_phone}"]
            convos = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == lead.client_id,
                models.ChatConversation.phone.in_(target_phones)
            ).all()
            for convo in convos:
                c_labels = convo.labels if isinstance(convo.labels, list) else []
                c_new = list(c_labels)
                c_changed = False
                for t in new_tags:
                    if t.lower() not in [x.lower() for x in c_new]:
                        c_new.append(t)
                        c_changed = True
                if c_changed:
                    convo.labels = c_new
                    flag_modified(convo, "labels")
    return changed


class BulkTagRequest(BaseModel):
    lead_ids: List[int]
    tag: str


@router.post("/leads/bulk-tag", summary="Adicionar etiqueta a múltiplos leads selecionados")
def bulk_tag_leads(
    request: BulkTagRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """Aplica uma (ou mais, separadas por vírgula) etiqueta(s) aos leads informados,
    preservando as etiquetas que já existiam em cada contato."""
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta.")

    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    tagged_count = sum(1 for lead in leads if _add_tags_to_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "tagged_count": tagged_count,
        "total": len(leads),
        "message": f"Etiqueta aplicada a {tagged_count} de {len(leads)} contato(s) selecionado(s)."
    }


class BulkTagAllRequest(BaseModel):
    tag: str
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag_filter: Optional[List[str]] = None  # etiquetas usadas para filtrar quais leads receberão a nova etiqueta
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None
    is_locked: Optional[str] = None
    has_bsud: Optional[str] = None
    filter_ddi: Optional[str] = None
    filter_ddd: Optional[str] = None


@router.post("/leads/bulk-tag-all", summary="Adicionar etiqueta a todos os leads dos filtros ativos")
def bulk_tag_all_leads(
    request: BulkTagAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Aplica uma etiqueta a TODOS os leads que correspondem aos filtros informados.
    Usado quando o usuário seleciona 'Todos os contatos de todas as páginas'.
    """
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta.")

    client_id = x_client_id if x_client_id else current_user.client_id
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    query = _apply_common_lead_filters(
        query, request.search, request.event_type, None, request.tag_filter, "OR",
        request.is_locked, request.has_bsud, request.date_from, request.date_to,
        request.imported_by_client_id, request.origin
    )

    if request.filter_ddi:
        clean_ddi = re.sub(r"\D", "", request.filter_ddi)
        if clean_ddi:
            query = query.filter(models.WebhookLead.phone.like(f"{clean_ddi}%"))

    if request.filter_ddd:
        clean_ddd = re.sub(r"\D", "", request.filter_ddd)
        if clean_ddd:
            query = query.filter(or_(
                models.WebhookLead.phone.like(f"55{clean_ddd}%"),
                models.WebhookLead.phone.like(f"{clean_ddd}%")
            ))

    leads = query.all()
    tagged_count = sum(1 for lead in leads if _add_tags_to_lead(lead, request.tag))
    db.commit()

    return {
        "status": "success",
        "tagged_count": tagged_count,
        "total": len(leads),
        "message": f"Etiqueta aplicada a {tagged_count} de {len(leads)} contato(s)."
    }


def _remove_tags_from_lead(lead, remove_tags_str: str, db: Optional[Session] = None) -> bool:
    """Remove etiqueta(s) do campo 'tags' do lead e das labels da conversa correspondente.
    Aceita múltiplas etiquetas separadas por vírgula. Retorna True se algo mudou."""
    existing = [t.strip() for t in (lead.tags or '').split(',') if t.strip()]
    to_remove = [t.strip().lower() for t in (remove_tags_str or '').split(',') if t.strip()]
    if not existing or not to_remove:
        return False

    new_existing = [t for t in existing if t.lower() not in to_remove]
    changed = len(new_existing) != len(existing)

    if changed:
        from sqlalchemy.orm.attributes import flag_modified
        lead.tags = ', '.join(new_existing)
        lead.updated_at = datetime.now()
        flag_modified(lead, "tags")

        if db and lead.phone and lead.client_id:
            clean_phone = str(lead.phone).replace('+', '').strip()
            target_phones = [lead.phone, clean_phone, f"+{clean_phone}"]
            convos = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == lead.client_id,
                models.ChatConversation.phone.in_(target_phones)
            ).all()
            for convo in convos:
                c_labels = convo.labels if isinstance(convo.labels, list) else []
                c_new = [x for x in c_labels if isinstance(x, str) and x.lower() not in to_remove]
                if len(c_new) != len(c_labels):
                    convo.labels = c_new
                    flag_modified(convo, "labels")
    return changed


@router.post("/leads/bulk-untag", summary="Remover etiqueta de múltiplos leads selecionados")
def bulk_untag_leads(
    request: BulkTagRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """Remove uma (ou mais, separadas por vírgula) etiqueta(s) dos leads informados."""
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta para remover.")

    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    untagged_count = sum(1 for lead in leads if _remove_tags_from_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "untagged_count": untagged_count,
        "total": len(leads),
        "message": f"Etiqueta removida de {untagged_count} de {len(leads)} contato(s) selecionado(s)."
    }


@router.post("/leads/bulk-untag-all", summary="Remover etiqueta de todos os leads dos filtros ativos")
def bulk_untag_all_leads(
    request: BulkTagAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """Remove uma etiqueta de TODOS os leads que correspondem aos filtros informados."""
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail="Informe ao menos uma etiqueta para remover.")

    client_id = x_client_id if x_client_id else current_user.client_id
    query = _filter_leads_by_active_filters(db, client_id, request)

    leads = query.all()
    untagged_count = sum(1 for lead in leads if _remove_tags_from_lead(lead, request.tag, db=db))
    db.commit()

    return {
        "status": "success",
        "untagged_count": untagged_count,
        "total": len(leads),
        "message": f"Etiqueta removida de {untagged_count} de {len(leads)} contato(s)."
    }


def _filter_leads_by_active_filters(db: Session, client_id: int, filters):
    """Reconstrói a query de leads a partir de um objeto de filtros (Bulk*AllRequest),
    espelhando exatamente os filtros usados em /leads. Usado pelas rotas
    '...-all' (bloquear/colocar em repouso/etiquetar todos os filtrados)."""
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    query = _apply_common_lead_filters(
        query, filters.search, filters.event_type, None, getattr(filters, 'tag_filter', None), "OR",
        filters.is_locked, filters.has_bsud, filters.date_from, filters.date_to,
        filters.imported_by_client_id, filters.origin
    )

    if filters.filter_ddi:
        clean_ddi = re.sub(r"\D", "", filters.filter_ddi)
        if clean_ddi:
            query = query.filter(models.WebhookLead.phone.like(f"{clean_ddi}%"))

    if filters.filter_ddd:
        clean_ddd = re.sub(r"\D", "", filters.filter_ddd)
        if clean_ddd:
            query = query.filter(or_(
                models.WebhookLead.phone.like(f"55{clean_ddd}%"),
                models.WebhookLead.phone.like(f"{clean_ddd}%")
            ))

    return query


class BulkBlockRequest(BaseModel):
    lead_ids: List[int]


@router.post("/leads/bulk-block", summary="Bloquear permanentemente múltiplos leads selecionados")
def bulk_block_leads(
    request: BulkBlockRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """Coloca os leads informados na lista de bloqueio permanente (BlockedContact) —
    eles param de receber disparos até serem desbloqueados manualmente."""
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = _get_blocked_suffixes(db, related_client_ids)

    blocked_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.BlockedContact(client_id=client_id, phone=lead.phone, name=lead.name, reason="Bloqueado via Contatos"))
        blocked_count += 1

    db.commit()
    return {
        "status": "success",
        "blocked_count": blocked_count,
        "already_blocked_count": already_count,
        "message": f"{blocked_count} contato(s) bloqueado(s) permanentemente."
    }


class BulkBlockAllRequest(BaseModel):
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag_filter: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None
    is_locked: Optional[str] = None
    has_bsud: Optional[str] = None
    filter_ddi: Optional[str] = None
    filter_ddd: Optional[str] = None


@router.post("/leads/bulk-block-all", summary="Bloquear permanentemente todos os leads dos filtros ativos")
def bulk_block_all_leads(
    request: BulkBlockAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = _filter_leads_by_active_filters(db, client_id, request).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = _get_blocked_suffixes(db, related_client_ids)

    blocked_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.BlockedContact(client_id=client_id, phone=lead.phone, name=lead.name, reason="Bloqueado via Contatos"))
        blocked_count += 1

    db.commit()
    return {
        "status": "success",
        "blocked_count": blocked_count,
        "already_blocked_count": already_count,
        "message": f"{blocked_count} contato(s) bloqueado(s) permanentemente."
    }


class BulkRestRequest(BaseModel):
    lead_ids: List[int]
    hours: Optional[int] = 24


@router.post("/leads/bulk-rest", summary="Colocar múltiplos leads selecionados em repouso temporário")
def bulk_rest_leads(
    request: BulkRestRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """Coloca os leads informados em repouso (RestingContact) — param de receber
    disparos até o prazo definido expirar (ou serem tirados do repouso manualmente)."""
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = set(_get_resting_suffix_map(db, related_client_ids).keys())
    now = datetime.utcnow()
    hours = request.hours or 24

    rested_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.RestingContact(
            client_id=client_id, phone=lead.phone, name=lead.name,
            reason="Repouso via Contatos", expires_at=now + timedelta(hours=hours)
        ))
        rested_count += 1

    db.commit()
    return {
        "status": "success",
        "rested_count": rested_count,
        "already_resting_count": already_count,
        "message": f"{rested_count} contato(s) colocado(s) em repouso por {hours}h."
    }


class BulkRestAllRequest(BaseModel):
    hours: Optional[int] = 24
    search: Optional[str] = None
    event_type: Optional[str] = None
    tag_filter: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    imported_by_client_id: Optional[int] = None
    origin: Optional[str] = None
    is_locked: Optional[str] = None
    has_bsud: Optional[str] = None
    filter_ddi: Optional[str] = None
    filter_ddd: Optional[str] = None


@router.post("/leads/bulk-rest-all", summary="Colocar todos os leads dos filtros ativos em repouso temporário")
def bulk_rest_all_leads(
    request: BulkRestAllRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = _filter_leads_by_active_filters(db, client_id, request).all()

    related_client_ids = _get_related_client_ids(db, client_id)
    existing_suffixes = set(_get_resting_suffix_map(db, related_client_ids).keys())
    now = datetime.utcnow()
    hours = request.hours or 24

    rested_count = 0
    already_count = 0
    seen = set()
    for lead in leads:
        suffix = _phone_suffix(lead.phone)
        if not suffix or suffix in existing_suffixes or suffix in seen:
            already_count += 1
            continue
        seen.add(suffix)
        db.add(models.RestingContact(
            client_id=client_id, phone=lead.phone, name=lead.name,
            reason="Repouso via Contatos", expires_at=now + timedelta(hours=hours)
        ))
        rested_count += 1

    db.commit()
    return {
        "status": "success",
        "rested_count": rested_count,
        "already_resting_count": already_count,
        "message": f"{rested_count} contato(s) colocado(s) em repouso por {hours}h."
    }


@router.patch("/leads/{lead_id}/lock", summary="Proteger ou desproteger um lead contra exclusão")
def toggle_lead_lock(
    lead_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    lead.is_locked = not getattr(lead, 'is_locked', False)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    status = "protegido" if lead.is_locked else "desprotegido"
    return {"status": "success", "is_locked": lead.is_locked, "message": f"Contato {status} com sucesso."}


@router.post("/leads/validate-contacts", summary="Validar contatos antes de um disparo em massa (janela 24h / bloqueio)")
async def validate_contacts_for_bulk(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Valida uma lista de números antes de um disparo em massa, usando somente dados
    locais (não depende mais do Chatwoot): tabela customizada do cliente
    (SYNC_CONTACTS_TABLE), cache local de janela (ContactWindow) e bloqueio/repouso.
    """
    import asyncio
    from sqlalchemy import text
    from config_loader import get_setting

    client_id = x_client_id if x_client_id else current_user.client_id
    contacts = payload.get("phones", [])

    semaphore = asyncio.Semaphore(500)

    try:
        # 1. Tabela customizada (SYNC_CONTACTS_TABLE), se configurada
        sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "", client_id=client_id)
        custom_mapping = {}
        clean_phones_input = [''.join(filter(str.isdigit, str(p))) for p in contacts]

        if sync_table_raw and clean_phones_input:
            safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == '_')
            try:
                phones_tuple = tuple(clean_phones_input)
                if phones_tuple:
                    sql = text(f"SELECT phone, name, last_interaction_at FROM {safe_table} WHERE phone IN :phones")
                    result = db.execute(sql, {"phones": phones_tuple}).fetchall()
                    for row in result:
                        p_cleaned = str(row[0])
                        custom_mapping[p_cleaned] = {"name": row[1], "last_interaction": row[2]}
            except Exception as e:
                logger.error(f"⚠️ [VALIDATE] Erro ao consultar tabela customizada {sync_table_raw}: {e}")

        # 2. Cache local (ContactWindow)
        window_map = {}
        if clean_phones_input:
            cached_windows = db.query(models.ContactWindow).filter(
                models.ContactWindow.client_id == client_id
            ).all()
            for w in cached_windows:
                clean_w_phone = "".join(filter(str.isdigit, str(w.phone)))
                window_map[clean_w_phone] = w
                if len(clean_w_phone) >= 8:
                    window_map[clean_w_phone[-8:]] = w

        # 3. Sufixos bloqueados/em repouso
        blocked_suffixes = set()
        try:
            blocked_entries = db.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id == client_id
            ).all()
            blocked_suffixes = {b.phone[-8:] for b in blocked_entries if len(b.phone) >= 8}

            now = datetime.utcnow()
            resting_entries = db.query(models.RestingContact.phone).filter(
                models.RestingContact.client_id == client_id,
                models.RestingContact.expires_at > now
            ).all()
            for r in resting_entries:
                if len(r.phone) >= 8:
                    blocked_suffixes.add(r.phone[-8:])
        except Exception as e:
            logger.error(f"⚠️ [VALIDATE] Erro ao carregar sufixos bloqueados/repouso: {e}")

        async def check_contact(phone):
            async with semaphore:
                clean_phone = ''.join(filter(str.isdigit, str(phone)))
                status_data = {
                    "phone": clean_phone, "original": phone, "exists": False,
                    "window_open": False, "is_blocked": False,
                    "contact_name": None, "contact_id": None,
                    "conversation_id": None, "last_activity": None
                }

                if len(clean_phone) >= 8 and clean_phone[-8:] in blocked_suffixes:
                    status_data["is_blocked"] = True

                custom_entry = custom_mapping.get(clean_phone)
                if custom_entry:
                    status_data["exists"] = True
                    status_data["contact_name"] = custom_entry["name"]
                    status_data["last_activity"] = custom_entry["last_interaction"]

                window_entry = window_map.get(clean_phone)
                if not window_entry and len(clean_phone) >= 8:
                    window_entry = window_map.get(clean_phone[-8:])
                if window_entry:
                    status_data["exists"] = True
                    if not status_data["contact_name"]:
                        status_data["contact_name"] = window_entry.chatwoot_contact_name
                    status_data["conversation_id"] = window_entry.chatwoot_conversation_id
                    if not custom_entry:
                        status_data["last_activity"] = window_entry.last_interaction_at

                if status_data["last_activity"]:
                    last_activity = status_data["last_activity"]
                    if last_activity.tzinfo is None:
                        now_cmp = datetime.now()
                    else:
                        from datetime import timezone
                        now_cmp = datetime.now(timezone.utc)
                    if now_cmp - last_activity < timedelta(hours=24):
                        status_data["window_open"] = True
                    status_data["last_activity"] = status_data["last_activity"].isoformat()

                return status_data

        tasks = [check_contact(phone) for phone in contacts]
        results = await asyncio.gather(*tasks)
        return {r["phone"]: r for r in results}

    except Exception as e:
        logger.error(f"Error in validate_contacts_for_bulk: {e}")
        return {}

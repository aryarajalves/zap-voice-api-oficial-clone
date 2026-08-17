import os
import re
import csv
import io
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

import models
import schemas
from core.deps import get_db
from core.permissions import require_feature, require_user
from core.logger import setup_logger
from .common_filters import (
    extract_ddi_ddd,
    _apply_common_lead_filters,
    _get_related_client_ids,
    _get_blocked_suffixes,
    _get_resting_suffix_map,
    _phone_suffix,
)

logger = setup_logger("LeadsRouter.Query")

router = APIRouter()


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
    'exclude_tag' remove da lista qualquer contato que possua ao menos uma das
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

    # Bloqueio real (BlockedContact) e repouso temporário (RestingContact)
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
    exclude_tag: Optional[List[str]] = Query(None),
    tag_mode: Optional[str] = "OR",
    ids: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    imported_by_client_id: Optional[int] = None,
    origin: Optional[str] = None,
    is_locked: Optional[str] = None,
    has_bsud: Optional[str] = None,
    filter_ddi: Optional[str] = None,
    filter_ddd: Optional[str] = None,
    block_status: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Gera um arquivo CSV com todos os leads filtrados ou com os leads selecionados.
    Se 'ids' for informado, exporta apenas esses IDs. Caso contrário, exporta todos
    os contatos que batem com os filtros ativos.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    # Se IDs específicos forem passados, ignora os demais filtros
    if ids:
        id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
        if id_list:
            query = query.filter(models.WebhookLead.id.in_(id_list))
    else:
        query = _apply_common_lead_filters(
            query, search, event_type, product_name, tag, tag_mode,
            is_locked, has_bsud, date_from, date_to, imported_by_client_id, origin,
            exclude_tag=exclude_tag
        )

        # Filtros de DDI/DDD
        if filter_ddi or filter_ddd:
            filtered_ids = []
            for lead_obj in query.all():
                ddi, ddd = extract_ddi_ddd(lead_obj.phone)
                if filter_ddi and ddi != filter_ddi:
                    continue
                if filter_ddd and ddd != filter_ddd:
                    continue
                filtered_ids.append(lead_obj.id)
            query = query.filter(models.WebhookLead.id.in_(filtered_ids)) if filtered_ids else query.filter(False)

        # Filtro de status de bloqueio / repouso
        if block_status:
            related_client_ids = _get_related_client_ids(db, client_id)
            blocked_suffixes = _get_blocked_suffixes(db, related_client_ids)
            resting_suffix_map = _get_resting_suffix_map(db, related_client_ids)

            matching_ids = []
            for lead_obj in query.all():
                suffix = _phone_suffix(lead_obj.phone)
                is_blocked = suffix in blocked_suffixes
                is_resting = suffix in resting_suffix_map

                if block_status == 'normal' and not is_blocked and not is_resting:
                    matching_ids.append(lead_obj.id)
                elif block_status == 'blocked' and is_blocked:
                    matching_ids.append(lead_obj.id)
                elif block_status == 'resting' and is_resting:
                    matching_ids.append(lead_obj.id)

            query = query.filter(models.WebhookLead.id.in_(matching_ids)) if matching_ids else query.filter(False)

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

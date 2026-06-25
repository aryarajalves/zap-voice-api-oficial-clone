import os
import re
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, cast, String
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

import models
import schemas
from core.deps import get_db
from core.permissions import require_premium, require_user, require_feature
from services.leads import upsert_webhook_lead
from core.logger import setup_logger

logger = setup_logger("LeadsRouter")

class BulkDeleteRequest(BaseModel):
    lead_ids: List[int]

router = APIRouter()

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

@router.post("/leads/clean-corrupted-tags", summary="Limpar tags corrompidas de todos os leads")
def clean_corrupted_tags(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Remove tags corrompidas (com barras, aspas escapadas, JSON malformado) de todos os leads do cliente.
    Mantém apenas tags simples compostas por letras, números, hífens e underscores.
    """
    client_id = x_client_id if x_client_id else current_user.client_id

    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.client_id == client_id,
        models.WebhookLead.tags.isnot(None)
    ).all()

    cleaned_count = 0
    leads_affected = 0

    for lead in leads:
        if not lead.tags:
            continue
        raw_tags = [t.strip() for t in lead.tags.split(',') if t.strip()]
        # Manter apenas tags "limpas": só letras, números, hífen, underscore e espaço simples
        clean_tags = [t for t in raw_tags if re.match(r'^[\w\s\-]+$', t, re.UNICODE) and len(t) <= 50]
        removed = len(raw_tags) - len(clean_tags)
        if removed > 0:
            lead.tags = ', '.join(clean_tags) if clean_tags else None
            cleaned_count += removed
            leads_affected += 1

    db.commit()
    return {
        "status": "success",
        "leads_affected": leads_affected,
        "tags_removed": cleaned_count,
        "message": f"{cleaned_count} tag(s) corrompida(s) removida(s) de {leads_affected} contato(s)."
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
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    imported_by_client_id: Optional[int] = None,
    origin: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("leads"))
):
    """
    Retorna a lista de leads capturados via webhook, com filtros e busca.
    Filtros de data (date_from, date_to) aceitam formato ISO 8601 (YYYY-MM-DD).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Verificar se o cliente tem um projeto associado
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None

    if proj_id:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.project_id == proj_id)
    else:
        query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

    if imported_by_client_id:
        query = query.filter(
            or_(
                models.WebhookLead.imported_by_client_id == imported_by_client_id,
                # Se imported_by_client_id não estiver preenchido no contato mas o client_id do contato coincidir com o pesquisado
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
                query = query.filter(and_(*(models.WebhookLead.tags.ilike(f"%{t}%") for t in tags_filter)))
            else:
                query = query.filter(or_(*(models.WebhookLead.tags.ilike(f"%{t}%") for t in tags_filter)))

    # Filtro de data de criação do contato
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.WebhookLead.created_at >= dt_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_from inválido. Use YYYY-MM-DD.")

    if date_to:
        try:
            # Incluir o dia inteiro: até 23:59:59
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1, seconds=-1)
            query = query.filter(models.WebhookLead.created_at <= dt_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de date_to inválido. Use YYYY-MM-DD.")

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

    return {
        "items": items,
        "total": total
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
                query = query.filter(or_(*(models.WebhookLead.tags.ilike(f"%{t}%") for t in tags_filter)))

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
    """
    if lead.phone:
        # 1. Deletar Scheduled Triggers com esse telefone
        db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.contact_phone == lead.phone
        ).delete(synchronize_session=False)

        # 2. Deletar Histórico que contenha esse telefone
        integrations_subquery = db.query(models.WebhookIntegration.id).filter(
            models.WebhookIntegration.client_id == client_id
        ).subquery()

        histories = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.integration_id.in_(integrations_subquery),
            cast(models.WebhookHistory.processed_data, String).like(f"%{lead.phone}%")
        ).all()
        for h in histories:
            db.delete(h)

    # 3. Deletar Lead
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
        raise HTTPException(status_code=403, detail="Este contato está bloqueado e não pode ser excluído.")

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
        msg += f" {skipped_locked} ignorado(s) por estarem bloqueados."
    return {"status": "success", "deleted_count": deleted_count, "skipped_locked": skipped_locked, "message": msg}

@router.patch("/leads/{lead_id}/lock", summary="Bloquear ou desbloquear um lead")
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
    status = "bloqueado" if lead.is_locked else "desbloqueado"
    return {"status": "success", "is_locked": lead.is_locked, "message": f"Contato {status} com sucesso."}

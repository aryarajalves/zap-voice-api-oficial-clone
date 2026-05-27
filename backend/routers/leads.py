import os
from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
from chatwoot_client import ChatwootClient
from sqlalchemy import or_, desc, cast, String
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import models, schemas
import json
import pandas as pd
import io
from core.deps import get_current_user, get_db
from core.permissions import require_premium, require_user
from services.leads import upsert_webhook_lead

class BulkDeleteRequest(BaseModel):
    lead_ids: List[int]

class LeadBatchItem(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None

class BulkCreateLeadsRequest(BaseModel):
    leads: List[LeadBatchItem]
    tags: Optional[str] = None

router = APIRouter()

@router.post("/leads/bulk", summary="Salvar múltiplos leads em massa")
def bulk_create_leads(
    request: BulkCreateLeadsRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Cria ou atualiza uma lista de leads.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    success_count = 0
    
    for item in request.leads:
        # Limpeza de telefone
        import re
        clean_phone = re.sub(r"\D", "", item.phone)
        if not clean_phone or len(clean_phone) < 8:
            continue
            
        lead_data = {
            "phone": clean_phone,
            "name": item.name,
            "email": item.email,
            "event_type": "bulk_manual_import"
        }
        
        upsert_webhook_lead(
            db=db,
            client_id=client_id,
            platform="manual_bulk",
            parsed_data=lead_data,
            tag=request.tags
        )
        success_count += 1
        
    db.commit()
    return {"status": "success", "imported": success_count}

@router.post("/leads/import/preview", summary="Pré-visualizar arquivo de importação")
async def preview_import(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_premium)
):
    """
    Lê o arquivo e retorna os nomes das colunas e as primeiras 3 linhas.
    """
    try:
        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()
        
        if file_extension == 'csv':
            # Tentar detectar o separador (vírgula ou ponto-e-vírgula)
            try:
                df = pd.read_csv(io.BytesIO(content), sep=';', nrows=3)
                if len(df.columns) <= 1:
                    df = pd.read_csv(io.BytesIO(content), sep=',', nrows=3)
            except:
                df = pd.read_csv(io.BytesIO(content), nrows=3)
        elif file_extension in ['xls', 'xlsx']:
            df = pd.read_excel(io.BytesIO(content), nrows=3)
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use CSV ou Excel.")

        # Converter para strings para o JSON
        headers = df.columns.tolist()
        preview_rows = df.fillna("").values.tolist()
        
        # Tentar detectar coluna de telefone para contagem de únicos
        unique_contacts = len(df)
        total_rows = len(df)
        
        phone_cols = [h for h in headers if any(word in h.lower() for word in ['tel', 'phone', 'zap', 'whats', 'cel'])]
        if phone_cols:
            p_col = phone_cols[0]
            # Limpar e pegar últimos 8 dígitos para contar únicos "reais"
            def get_last_8(p):
                clean = "".join(filter(str.isdigit, str(p)))
                return clean[-8:] if len(clean) >= 8 else clean
            
            unique_contacts = df[p_col].apply(get_last_8).nunique()

        return {
            "headers": headers,
            "preview_rows": preview_rows,
            "filename": file.filename,
            "total_rows": total_rows,
            "unique_rows": unique_contacts
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

@router.post("/leads/import/execute", summary="Executar importação de contatos")
async def execute_import(
    file: UploadFile = File(...),
    mapping: str = Form(...), # JSON string do mapeamento
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Processa o arquivo aplicando o mapeamento de colunas e salvando no banco.
    """
    try:
        client_id = x_client_id if x_client_id else current_user.client_id
        mapping_dict = json.loads(mapping) # {"name": "col_a", "phone": "col_b", ...}
        
        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()
        
        if file_extension == 'csv':
            try:
                df = pd.read_csv(io.BytesIO(content), sep=';')
                if len(df.columns) <= 1:
                    df = pd.read_csv(io.BytesIO(content), sep=',')
            except:
                df = pd.read_csv(io.BytesIO(content))
        elif file_extension in ['xls', 'xlsx']:
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado.")

        # Normalização: Garantir que as colunas mapeadas existem no DF
        for key, col_name in mapping_dict.items():
            if col_name and col_name not in df.columns:
                raise HTTPException(status_code=400, detail=f"Coluna '{col_name}' não encontrada no arquivo.")

        # --- Pré-processamento e Deduplicação ---
        # 1. Limpar telefone e remover o que não for dígito
        def clean_p(p):
            if pd.isna(p): return ""
            return "".join(filter(str.isdigit, str(p)))

        phone_col = mapping_dict.get('phone')
        df['temp_clean_phone'] = df[phone_col].apply(clean_p)
        
        # 2. Remover linhas sem telefone válido (mínimo 8 dígitos)
        df = df[df['temp_clean_phone'].str.len() >= 8]
        
        # 3. Criar coluna de comparação (últimos 8 dígitos)
        df['temp_last_8'] = df['temp_clean_phone'].str[-8:]
        
        # 4. Remover duplicatas na própria planilha baseado nos últimos 8 dígitos
        # Mantemos a primeira ocorrência encontrada
        df = df.drop_duplicates(subset=['temp_last_8'], keep='first')
        # --- Fim do Pré-processamento ---

        success_count = 0
        error_count = 0
        
        # Iterar e importar
        for _, row in df.iterrows():
            try:
                clean_phone = row['temp_clean_phone']
                
                lead_data = {
                    "phone": clean_phone,
                    "name": str(row.get(mapping_dict.get('name'))) if mapping_dict.get('name') else None,
                    "email": str(row.get(mapping_dict.get('email'))) if mapping_dict.get('email') else None,
                    "event_type": "importado"
                }
                
                # Limpar strings 'nan'
                for k, v in lead_data.items():
                    if str(v).strip().lower() == 'nan':
                        lead_data[k] = None

                tag = str(row.get(mapping_dict.get('tags'))) if mapping_dict.get('tags') else None
                if str(tag).strip().lower() == 'nan':
                    tag = None

                tags_to_remove = str(row.get(mapping_dict.get('remove_tags'))) if mapping_dict.get('remove_tags') else None
                if str(tags_to_remove).strip().lower() == 'nan':
                    tags_to_remove = None

                # Chamar serviço de upsert (já atualizado para dar match pelos últimos 8 dígitos e gerenciar múltiplas tags)
                upsert_webhook_lead(db, client_id, "importação", lead_data, tag=tag, tags_to_remove=tags_to_remove)
                success_count += 1
            except Exception as e:
                print(f"Erro ao importar linha: {e}")
                error_count += 1

        db.commit()
        return {
            "status": "success",
            "imported": success_count,
            "errors": error_count,
            "message": f"Importação concluída: {success_count} contatos importados/atualizados."
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro interno na importação: {str(e)}")

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
    import re
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
    import re
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
    tag: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Retorna a lista de leads capturados via webhook, com filtros e busca.
    Filtros de data (date_from, date_to) aceitam formato ISO 8601 (YYYY-MM-DD).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    query = db.query(models.WebhookLead).filter(models.WebhookLead.client_id == client_id)

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
        query = query.filter(models.WebhookLead.tags.ilike(f"%{tag}%"))

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
    items = query.order_by(desc(models.WebhookLead.last_event_at)).offset(skip).limit(limit).all()

    # Dynamic Redirection Logic — usando a sessão já existente para não abrir nova conexão com o banco
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
    import re as _re
    base_url = _re.sub(r"/api(/v\d+)?/?$", "", raw_url.strip().rstrip("/"))

    for item in items:
        if item.chatwoot_conversation_id and item.chatwoot_account_id:
            item.chatwoot_url = f"{base_url}/app/accounts/{item.chatwoot_account_id}/conversations/{item.chatwoot_conversation_id}"
        else:
            item.chatwoot_url = None

    return {
        "items": items,
        "total": total
    }

@router.get("/leads/filters", summary="Obter valores únicos para filtros")
def get_lead_filters(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Retorna os tipos de eventos e nomes de produtos únicos para preencher os filtros do Frontend.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    event_types = db.query(models.WebhookLead.last_event_type)\
        .filter(models.WebhookLead.client_id == client_id)\
        .distinct().all()
    
    product_names = db.query(models.WebhookLead.product_name)\
        .filter(models.WebhookLead.client_id == client_id)\
        .distinct().all()
    
    # Get all tags, split them and return unique sorted list
    all_tags_raw = db.query(models.WebhookLead.tags)\
        .filter(models.WebhookLead.client_id == client_id, models.WebhookLead.tags != None)\
        .distinct().all()
    
    unique_tags = set()
    for row in all_tags_raw:
        if row[0]:
            parts = [t.strip() for t in row[0].split(',') if t.strip()]
            for p in parts:
                unique_tags.add(p)

    return {
        "event_types": [e[0] for e in event_types if e[0]],
        "product_names": [p[0] for p in product_names if p[0]],
        "tags": sorted(list(unique_tags))
    }

@router.get("/leads/export", summary="Exportar Leads para CSV")
def export_leads_csv(
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    product_name: Optional[str] = None,
    tag: Optional[str] = None,
    ids: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user)
):
    """
    Gera um arquivo CSV com os leads filtrados.
    Se 'ids' for informado (ex: ids=1,2,3), exporta apenas esses leads.
    """
    import csv, io
    from fastapi.responses import StreamingResponse

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

        if product_name:
            query = query.filter(models.WebhookLead.product_name.ilike(f"%{product_name}%"))

        if tag:
            query = query.filter(models.WebhookLead.tags.ilike(f"%{tag}%"))

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

    leads = query.order_by(desc(models.WebhookLead.last_event_at)).all()

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
        import re
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

from core.logger import setup_logger
logger = setup_logger("LeadsRouter")

class ChatwootImportRequest(BaseModel):
    label: str
    import_all_tags: bool = False
    custom_tag: Optional[str] = None

async def run_chatwoot_import(
    client_id: int,
    label: str,
    import_all_tags: bool,
    custom_tag: Optional[str]
):
    from database import SessionLocal
    db = SessionLocal()
    try:
        logger.info(f"🚀 Iniciando importação assíncrona do Chatwoot. Client ID: {client_id}, Label: {label}")
        chatwoot = ChatwootClient(client_id=client_id)
        
        # 1. Fetch contacts from Chatwoot by label
        contacts = await chatwoot.get_contacts_by_label(label)
        if not contacts:
            logger.info(f"ℹ️ Nenhum contato encontrado no Chatwoot com a etiqueta '{label}'")
            return
            
        logger.info(f"📦 Encontrados {len(contacts)} contatos no Chatwoot com a etiqueta '{label}'")
        
        imported_count = 0
        for c in contacts:
            try:
                phone_raw = c.get("phone_number") or c.get("custom_attributes", {}).get("phone_number")
                if not phone_raw:
                    continue
                    
                import re
                clean_phone = re.sub(r"\D", "", str(phone_raw))
                if len(clean_phone) < 8:
                    continue
                    
                name = c.get("name")
                email = c.get("email")
                
                # Determine tags to apply
                tags_list = []
                
                # Option 1: Import all existing tags from the Chatwoot contact
                if import_all_tags:
                    # Get contact labels from Chatwoot client
                    c_labels = await chatwoot.get_contact_labels(c.get("id"))
                    if c_labels:
                        tags_list.extend(c_labels)
                        
                # Option 2: Always add the filter label
                tags_list.append(label)
                
                # Option 3: Add custom tag if provided
                if custom_tag:
                    tags_list.append(custom_tag)
                
                # Remove duplicates and format
                unique_tags = list(set([t.strip() for t in tags_list if t and t.strip()]))
                final_tags = ", ".join(unique_tags) if unique_tags else None
                
                lead_data = {
                    "phone": clean_phone,
                    "name": name,
                    "email": email,
                    "event_type": "importado_chatwoot"
                }
                
                upsert_webhook_lead(
                    db=db,
                    client_id=client_id,
                    platform="chatwoot_import",
                    parsed_data=lead_data,
                    tag=final_tags
                )
                imported_count += 1
            except Exception as row_error:
                logger.error(f"❌ Erro ao importar contato individual do Chatwoot: {row_error}")
                continue
                
        db.commit()
        logger.info(f"✅ Importação do Chatwoot concluída com sucesso! {imported_count} contatos importados/atualizados.")
    except Exception as e:
        logger.error(f"❌ Erro crítico no processo de importação do Chatwoot: {e}")
    finally:
        db.close()

@router.post("/leads/import/chatwoot", summary="Importar contatos de uma etiqueta do Chatwoot")
async def import_leads_from_chatwoot(
    request: ChatwootImportRequest,
    background_tasks: BackgroundTasks,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    background_tasks.add_task(
        run_chatwoot_import,
        client_id=client_id,
        label=request.label,
        import_all_tags=request.import_all_tags,
        custom_tag=request.custom_tag
    )
    return {
        "status": "success",
        "message": f"A importação dos contatos com a etiqueta '{request.label}' foi iniciada em segundo plano."
    }

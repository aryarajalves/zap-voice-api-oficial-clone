from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, cast, String
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel
import models, schemas
import json
import pandas as pd
import io
from core.deps import get_current_user, get_db
from services.leads import upsert_webhook_lead

class BulkDeleteRequest(BaseModel):
    lead_ids: List[int]

router = APIRouter()

@router.post("/leads/import/preview", summary="Pré-visualizar arquivo de importação")
async def preview_import(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
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
    current_user: models.User = Depends(get_current_user)
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
    current_user: models.User = Depends(get_current_user)
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
    current_user: models.User = Depends(get_current_user)
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna a lista de leads capturados via webhook, com filtros e busca.
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

    total = query.count()
    items = query.order_by(desc(models.WebhookLead.last_event_at)).offset(skip).limit(limit).all()

    # Dynamic Redirection Logic
    from config_loader import get_setting
    base_url = get_setting("CHATWOOT_URL", "https://app.chatwoot.com", client_id=client_id)
    if base_url.endswith("/"): base_url = base_url[:-1]

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
    current_user: models.User = Depends(get_current_user)
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Gera um arquivo CSV com os leads filtrados.
    """
    import csv, io
    from fastapi.responses import StreamingResponse

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

    if (product_name):
        query = query.filter(models.WebhookLead.product_name.ilike(f"%{product_name}%"))

    if (tag):
        query = query.filter(models.WebhookLead.tags.ilike(f"%{tag}%"))

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
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    lead = db.query(models.WebhookLead).filter(
        models.WebhookLead.id == lead_id,
        models.WebhookLead.client_id == client_id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    _delete_lead_and_relations(db, lead, client_id)
    db.commit()
    return {"status": "success", "message": "Lead e vínculos removidos."}

@router.put("/leads/{lead_id}", response_model=schemas.WebhookLead, summary="Atualizar um lead específico")
def update_lead(
    lead_id: int,
    lead_in: schemas.WebhookLeadUpdate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    leads = db.query(models.WebhookLead).filter(
        models.WebhookLead.id.in_(request.lead_ids),
        models.WebhookLead.client_id == client_id
    ).all()

    deleted_count = 0
    for lead in leads:
        _delete_lead_and_relations(db, lead, client_id)
        deleted_count += 1

    db.commit()
    return {"status": "success", "deleted_count": deleted_count}

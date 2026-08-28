import os
import re
import json
import io
from typing import Optional, List
from datetime import datetime, timezone
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func as sa_func
from pydantic import BaseModel

import models
from core.deps import get_db, get_validated_client_id
from core.permissions import require_premium
from services.leads import upsert_webhook_lead
from core.logger import setup_logger

from .parsers import (
    IMPORT_FILES_DIR,
    COUNTRY_TO_DDI,
    fix_mojibake,
    normalize_name,
    read_csv_smart,
    _parse_datetime_smart,
    _split_tags,
    _clean_phone_digits,
    _clean_ddi_val,
    _resolve_ddi_for_row,
    _get_phone_mapping_columns,
    _build_phone_series,
    _build_phone_components,
    _extract_row_name,
)
from .processor import process_import_in_bg

logger = setup_logger("LeadsImportRouter")


class LeadBatchItem(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    tags: Optional[str] = None


class BulkCreateLeadsRequest(BaseModel):
    leads: List[LeadBatchItem]
    tags: Optional[str] = None


class RenameImportRequest(BaseModel):
    filename: str


class DeleteImportsRequest(BaseModel):
    import_ids: List[int]


router = APIRouter()


@router.post("/leads/bulk", summary="Salvar múltiplos leads em massa")
def bulk_create_leads(
    request: BulkCreateLeadsRequest,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Cria ou atualiza uma lista de leads em massa com alta performance.
    """
    if not request.leads:
        return {"status": "success", "imported": 0}

    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None


    # Pré-carregar TODOS os contatos existentes em memória (1 consulta SQL ao invés de N)
    if proj_id:
        existing_rows = db.query(
            models.WebhookLead.id,
            models.WebhookLead.phone,
            models.WebhookLead.tags,
            models.WebhookLead.name,
            models.WebhookLead.email,
            models.WebhookLead.total_events,
        ).filter(models.WebhookLead.project_id == proj_id).all()
    else:
        existing_rows = db.query(
            models.WebhookLead.id,
            models.WebhookLead.phone,
            models.WebhookLead.tags,
            models.WebhookLead.name,
            models.WebhookLead.email,
            models.WebhookLead.total_events,
        ).filter(models.WebhookLead.client_id == client_id).all()

    existing_map = {}
    for lead_id, phone, tags, ex_name, ex_email, total_events in existing_rows:
        if phone:
            last_8 = str(phone)[-8:]
            existing_map[last_8] = {
                'id': lead_id,
                'tags': tags,
                'name': ex_name,
                'email': ex_email,
                'total_events': total_events or 0,
            }

    now = datetime.now(timezone.utc)
    global_tags = [t.strip() for t in request.tags.split(",") if t.strip()] if request.tags else []

    to_insert = []
    to_update = []
    seen_in_request = set()
    success_count = 0

    def _split_tags_local(val):
        if not val: return []
        return [t.strip() for t in str(val).split(",") if t.strip()]

    for item in request.leads:
        clean_phone = re.sub(r"\D", "", item.phone)
        if not clean_phone or len(clean_phone) < 8:
            continue

        last_8 = clean_phone[-8:]
        if last_8 in seen_in_request:
            continue
        seen_in_request.add(last_8)

        name = item.name.strip() if item.name and item.name.strip() else None
        email = item.email.strip() if item.email and item.email.strip() else None
        item_tags = _split_tags_local(item.tags)
        all_item_tags = list(dict.fromkeys(global_tags + item_tags))

        if last_8 in existing_map:
            ex = existing_map[last_8]
            curr_tags = _split_tags_local(ex['tags'])
            for t in all_item_tags:
                if t not in curr_tags:
                    curr_tags.append(t)

            update_dict = {
                'id': ex['id'],
                'tags': ", ".join(curr_tags) if curr_tags else None,
                'platform': 'manual_bulk',
                'total_events': (ex['total_events'] or 0) + 1,
                'last_event_at': now,
                'updated_at': now,
            }
            if name: update_dict['name'] = name
            if email: update_dict['email'] = email

            to_update.append(update_dict)
            success_count += 1
        else:
            insert_dict = {
                'client_id': client_id,
                'project_id': proj_id,
                'imported_by_client_id': client_id,
                'name': name,
                'phone': clean_phone,
                'email': email,
                'last_event_type': 'importado',
                'last_event_at': now,
                'platform': 'manual_bulk',
                'tags': ", ".join(all_item_tags) if all_item_tags else None,
                'total_events': 1,
                'created_at': now,
                'updated_at': now,
            }
            to_insert.append(insert_dict)
            success_count += 1

    if to_insert:
        db.bulk_insert_mappings(models.WebhookLead, to_insert)
    if to_update:
        db.bulk_update_mappings(models.WebhookLead, to_update)

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
        
        # Carregar o DataFrame completo para saber os totais reais
        if file_extension == 'csv':
            df_full = read_csv_smart(content, sep=';')
            if len(df_full.columns) <= 1:
                df_full = read_csv_smart(content, sep=',')
        elif file_extension in ['xls', 'xlsx']:
            df_full = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use CSV ou Excel.")

        # Obter primeiras 3 linhas para a prévia
        df_preview = df_full.head(3)

        # Converter para strings para o JSON
        headers = [str(h) for h in df_full.columns.tolist()]
        preview_rows = json.loads(df_preview.fillna("").astype(str).replace("nan", "").to_json(orient="values", force_ascii=False))
        
        # Tentar detectar coluna de telefone para contagem de únicos
        total_rows = len(df_full)
        unique_contacts = total_rows
        
        phone_cols = [h for h in headers if any(word in h.lower() for word in ['tel', 'phone', 'zap', 'whats', 'cel'])]
        if phone_cols:
            p_col = phone_cols[0]
            
            temp_clean = df_full[p_col].apply(_clean_phone_digits)
            temp_clean = temp_clean[temp_clean.str.len() >= 8]
            unique_contacts = temp_clean.str[-8:].nunique()

        return {
            "headers": headers,
            "preview_rows": preview_rows,
            "filename": file.filename,
            "total_rows": total_rows,
            "unique_rows": unique_contacts
        }
    except Exception as e:
        logger.error(f"Erro ao processar arquivo de preview: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")


@router.post("/leads/import/preview-phones", summary="Pré-visualizar telefones montados (todas as linhas)")
async def preview_phones(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    skip: int = Form(0),
    limit: int = Form(200),
    current_user: models.User = Depends(require_premium)
):
    """
    Recalcula como cada linha vai virar telefone com o mapeamento atual.
    """
    try:
        mapping_dict = json.loads(mapping)
        phone_mapping = mapping_dict.get('phone')
        name_col = mapping_dict.get('name')

        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension == 'csv':
            df = read_csv_smart(content, sep=';')
            if len(df.columns) <= 1:
                df = read_csv_smart(content, sep=',')
        elif file_extension in ['xls', 'xlsx']:
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use CSV ou Excel.")

        for col_name in _get_phone_mapping_columns(phone_mapping):
            if col_name not in df.columns:
                raise HTTPException(status_code=400, detail=f"Coluna '{col_name}' não encontrada no arquivo.")

        ddi_s, ddd_s, num_s = _build_phone_components(df, phone_mapping)
        full_s = ddi_s + ddd_s + num_s
        valid_mask = full_s.str.len() >= 8

        total_rows = len(df)
        limit = max(1, min(limit, 1000))
        skip = max(0, skip)
        end = min(skip + limit, total_rows)

        items = []
        for i in range(skip, end):
            items.append({
                "row_index": i,
                "name": _extract_row_name(df.iloc[i], name_col) if name_col else None,
                "ddi": ddi_s.iat[i],
                "ddd": ddd_s.iat[i],
                "number": num_s.iat[i],
                "full": full_s.iat[i],
                "valid": bool(valid_mask.iat[i]),
            })

        return {
            "total_rows": total_rows,
            "valid_count": int(valid_mask.sum()),
            "invalid_count": int((~valid_mask).sum()),
            "items": items,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao pré-visualizar telefones: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao pré-visualizar telefones: {str(e)}")


@router.post("/leads/import/execute", summary="Executar importação de contatos")
async def execute_import(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mapping: str = Form(...),
    fixed_tags: Optional[str] = Form(None),
    fixed_remove_tags: Optional[str] = Form(None),
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Inicia o processamento do arquivo aplicando o mapeamento de colunas em segundo plano.
    """
    try:
        mapping_dict = json.loads(mapping)

        # Buscar projeto associado ao cliente
        active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
        proj_id = active_client.project_id if active_client else None

        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()

        # Validação preventiva de colunas mapeadas e conteúdo de telefone
        if file_extension == 'csv':
            df_val = read_csv_smart(content, sep=';')
            if len(df_val.columns) <= 1:
                df_val = read_csv_smart(content, sep=',')
        elif file_extension in ['xls', 'xlsx']:
            df_val = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use CSV ou Excel.")

        phone_cols = _get_phone_mapping_columns(mapping_dict.get('phone'))
        if not phone_cols:
            raise HTTPException(status_code=400, detail="A coluna de Telefone é obrigatória.")

        for pcol in phone_cols:
            if pcol not in df_val.columns:
                raise HTTPException(status_code=400, detail=f"A coluna de telefone '{pcol}' não foi encontrada no arquivo.")
            str_series = df_val[pcol].dropna().astype(str).str.strip()
            if str_series.empty or str_series.eq('').all() or str_series.str.lower().isin(['nan', 'none', 'null']).all():
                raise HTTPException(status_code=400, detail=f"A coluna '{pcol}' foi selecionada para Telefone, mas não possui nenhuma informação no arquivo.")

        for k, v in mapping_dict.items():
            if k != 'phone' and v and isinstance(v, str):
                if v not in df_val.columns:
                    raise HTTPException(status_code=400, detail=f"A coluna '{v}' não foi encontrada no arquivo.")
                str_series = df_val[v].dropna().astype(str).str.strip()
                if str_series.empty or str_series.eq('').all() or str_series.str.lower().isin(['nan', 'none', 'null']).all():
                    raise HTTPException(status_code=400, detail=f"A coluna '{v}' foi selecionada, mas não possui nenhuma informação no arquivo.")

        # Validar se após a extração resta ao menos 1 número válido
        phone_series = _build_phone_series(df_val, mapping_dict.get('phone'))
        valid_phones = phone_series[phone_series.str.len() >= 8]
        if valid_phones.empty:
            p_desc = mapping_dict.get('phone')
            col_name_desc = p_desc if isinstance(p_desc, str) else (p_desc.get('number_column') if isinstance(p_desc, dict) else 'Telefone')
            raise HTTPException(
                status_code=400,
                detail=f"A coluna '{col_name_desc}' selecionada para Telefone não possui nenhum número válido no arquivo (mínimo 8 dígitos)."
            )

        clean_fixed_tags = fixed_tags if isinstance(fixed_tags, str) else ""
        clean_fixed_remove_tags = fixed_remove_tags if isinstance(fixed_remove_tags, str) else ""

        # Criar registro de histórico inicial
        history = models.ContactImportHistory(
            client_id=client_id,
            project_id=proj_id,
            filename=file.filename,
            status="pending",
            total_rows=0,
            imported_rows=0,
            error_rows=0,
            mapping_json=json.dumps(mapping_dict),
            fixed_tags=clean_fixed_tags,
            fixed_remove_tags=clean_fixed_remove_tags,
            file_ext=file_extension,
        )
        db.add(history)
        db.commit()
        db.refresh(history)

        # Salvar arquivo em disco para possível retomada após reinicialização
        saved_file_path = os.path.join(IMPORT_FILES_DIR, f"import_{history.id}.{file_extension}")
        with open(saved_file_path, "wb") as f:
            f.write(content)
        history.file_path = saved_file_path
        db.commit()

        # Adicionar background task
        background_tasks.add_task(
            process_import_in_bg,
            history.id,
            content,
            file_extension,
            mapping_dict,
            client_id,
            clean_fixed_tags,
            clean_fixed_remove_tags
        )

        return {
            "status": "success",
            "import_id": history.id,
            "message": "Importação iniciada em segundo plano."
        }
    except Exception as e:
        logger.error(f"Erro ao iniciar importação: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar importação: {str(e)}")


@router.get("/leads/import/history", summary="Obter histórico de importações")
def get_import_history(
    skip: int = 0,
    limit: int = 20,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Retorna o histórico de importações paginado para o cliente ativo (ou do projeto associado).
    """
    active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    proj_id = active_client.project_id if active_client else None
    
    if proj_id:
        query = db.query(models.ContactImportHistory).filter(
            models.ContactImportHistory.project_id == proj_id
        )
    else:
        query = db.query(models.ContactImportHistory).filter(
            models.ContactImportHistory.client_id == client_id
        )
        
    total = query.count()
    imports = query.order_by(desc(models.ContactImportHistory.created_at)).offset(skip).limit(limit).all()
    return {
        "items": imports,
        "total": total
    }


@router.get("/leads/import/{import_id}/results", summary="Ver contatos importados e rejeitados de uma importação")
def get_import_results(
    import_id: int,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Lista o resultado linha a linha de uma importação: contatos importados, atualizados e rejeitados.
    """
    history = db.query(models.ContactImportHistory).filter(
        models.ContactImportHistory.id == import_id,
        models.ContactImportHistory.client_id == client_id
    ).first()
    if not history:
        raise HTTPException(status_code=404, detail="Importação não encontrada.")

    base_query = db.query(models.ImportRowResult).filter(models.ImportRowResult.import_id == import_id)

    query = base_query
    if status == 'rejected':
        query = query.filter(models.ImportRowResult.status.in_(['rejected_invalid_phone', 'rejected_duplicate_file']))
    elif status:
        query = query.filter(models.ImportRowResult.status == status)

    if search:
        like = f"%{search.strip()}%"
        query = query.filter(or_(
            models.ImportRowResult.name.ilike(like),
            models.ImportRowResult.phone.ilike(like)
        ))

    total = query.count()
    rows = query.order_by(models.ImportRowResult.id.asc()).offset(skip).limit(min(limit, 500)).all()

    status_counts_raw = base_query.with_entities(
        models.ImportRowResult.status, sa_func.count(models.ImportRowResult.id)
    ).group_by(models.ImportRowResult.status).all()
    status_counts = {s: c for s, c in status_counts_raw}

    return {
        "items": rows,
        "total": total,
        "status_counts": status_counts,
    }


@router.put("/leads/import/{import_id}/rename", summary="Renomear lista importada")
def rename_import(
    import_id: int,
    request: RenameImportRequest,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Renomeia o arquivo ou lista importada.
    """
    history = db.query(models.ContactImportHistory).filter(
        models.ContactImportHistory.id == import_id,
        models.ContactImportHistory.client_id == client_id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="Importação não encontrada.")
        
    history.filename = request.filename
    db.commit()
    db.refresh(history)
    return history


@router.delete("/leads/import/{import_id}", summary="Deletar uma importação do histórico")
def delete_import(
    import_id: int,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    history = db.query(models.ContactImportHistory).filter(
        models.ContactImportHistory.id == import_id,
        models.ContactImportHistory.client_id == client_id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="Importação não encontrada.")
        
    db.delete(history)
    db.commit()
    return {"status": "success", "message": "Importação deletada com sucesso."}


@router.post("/leads/import/bulk-delete", summary="Deletar múltiplas importações do histórico")
def bulk_delete_imports(
    request: DeleteImportsRequest,
    client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    deleted_count = db.query(models.ContactImportHistory).filter(
        models.ContactImportHistory.id.in_(request.import_ids),
        models.ContactImportHistory.client_id == client_id
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"status": "success", "message": f"{deleted_count} importações deletadas com sucesso."}



__all__ = [
    "router",
    "LeadBatchItem",
    "BulkCreateLeadsRequest",
    "RenameImportRequest",
    "DeleteImportsRequest",
    "bulk_create_leads",
    "preview_import",
    "preview_phones",
    "execute_import",
    "get_import_history",
    "get_import_results",
    "rename_import",
    "delete_import",
    "bulk_delete_imports",
    "process_import_in_bg",
    "fix_mojibake",
    "normalize_name",
    "read_csv_smart",
    "_parse_datetime_smart",
    "_split_tags",
    "_clean_phone_digits",
    "_clean_ddi_val",
    "_resolve_ddi_for_row",
    "_get_phone_mapping_columns",
    "_build_phone_series",
    "_build_phone_components",
    "_extract_row_name",
    "COUNTRY_TO_DDI",
    "IMPORT_FILES_DIR",
]

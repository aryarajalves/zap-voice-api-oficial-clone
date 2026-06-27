import os
import re
import json
import io
import pandas as pd

IMPORT_FILES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "imports")
os.makedirs(IMPORT_FILES_DIR, exist_ok=True)


def fix_mojibake(text: str) -> str:
    """Corrige nomes com encoding quebrado (UTF-8 lido como Latin-1).
    Ex: 'RogÃ©rio' → 'Rogério'
    """
    if not text or not isinstance(text, str):
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def normalize_name(text: str) -> str:
    """Corrige encoding e aplica Title Case no nome.
    Ex: 'ALBERTO LEVI esquivel acuna' → 'Alberto Levi Esquivel Acuna'
    """
    if not text or not isinstance(text, str):
        return text
    fixed = fix_mojibake(text)
    return fixed.strip().title()


def read_csv_smart(content: bytes, sep: str = ";") -> pd.DataFrame:
    """Tenta ler CSV detectando encoding automaticamente."""
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(io.BytesIO(content), sep=sep, encoding=encoding)
            if len(df.columns) > 1:
                return df
        except Exception:
            continue
    # fallback — latin-1 cobre todos os 256 bytes, nunca vai lançar erro de encoding
    return pd.read_csv(io.BytesIO(content), sep=sep, encoding="latin-1")
from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
from chatwoot_client import ChatwootClient

import models
from core.deps import get_db
from core.permissions import require_premium
from services.leads import upsert_webhook_lead
from core.logger import setup_logger

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

class ChatwootImportRequest(BaseModel):
    label: str
    import_all_tags: bool = False
    custom_tag: Optional[str] = None

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
        clean_phone = re.sub(r"\D", "", item.phone)
        if not clean_phone or len(clean_phone) < 8:
            continue
            
        lead_data = {
            "phone": clean_phone,
            "name": item.name,
            "email": item.email,
            "event_type": "bulk_manual_import"
        }
        
        # Mesclar tags globais do request com as tags especificas do contato se existirem
        merged_tags = []
        if request.tags:
            merged_tags.extend([t.strip() for t in request.tags.split(",") if t.strip()])
        if item.tags:
            merged_tags.extend([t.strip() for t in item.tags.split(",") if t.strip()])
            
        final_tags = ", ".join(list(set(merged_tags))) if merged_tags else None
        
        upsert_webhook_lead(
            db=db,
            client_id=client_id,
            platform="manual_bulk",
            parsed_data=lead_data,
            tag=final_tags
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

        # Converter para strings para o JSON (garante tipos JSON-safe — numpy.int64 quebraria)
        headers = [str(h) for h in df_full.columns.tolist()]
        preview_rows = json.loads(df_preview.fillna("").astype(str).replace("nan", "").to_json(orient="values", force_ascii=False))
        
        # Tentar detectar coluna de telefone para contagem de únicos
        total_rows = len(df_full)
        unique_contacts = total_rows
        
        phone_cols = [h for h in headers if any(word in h.lower() for word in ['tel', 'phone', 'zap', 'whats', 'cel'])]
        if phone_cols:
            p_col = phone_cols[0]
            
            temp_clean = df_full[p_col].apply(lambda p: "".join(filter(str.isdigit, str(p))) if not pd.isna(p) else "")
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
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

def _split_tags(s):
    """Divide string de tags em lista, suportando JSON array ou vírgulas."""
    if not s: return []
    val = str(s).strip()
    if val.startswith('[') and val.endswith(']'):
        try:
            import json as _j
            parsed = _j.loads(val)
            if isinstance(parsed, list):
                return [str(t).strip() for t in parsed if str(t).strip()]
        except Exception:
            pass
    cleaned = val.replace('[', '').replace(']', '').replace('"', '').replace("'", "")
    return [t.strip() for t in cleaned.split(",") if t.strip()]


def process_import_in_bg(import_id: int, content: bytes, file_extension: str, mapping_dict: dict, client_id: int, fixed_tags: str = "", fixed_remove_tags: str = ""):
    # Obtain a fresh database session
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        # Get the history record
        history = db.query(models.ContactImportHistory).filter(models.ContactImportHistory.id == import_id).first()
        if not history:
            return
        
        history.status = "processing"
        db.commit()

        # Se content for None (retomada após restart), ler do arquivo salvo em disco
        if content is None:
            saved_path = history.file_path
            if not saved_path or not os.path.exists(saved_path):
                history.status = "failed"
                history.error_message = "Arquivo não encontrado para retomada. Por favor, reimporte."
                db.commit()
                return
            with open(saved_path, "rb") as f:
                content = f.read()

        # Load dataframe
        if file_extension == 'csv':
            df = read_csv_smart(content, sep=';')
            if len(df.columns) <= 1:
                df = read_csv_smart(content, sep=',')
        elif file_extension in ['xls', 'xlsx']:
            df = pd.read_excel(io.BytesIO(content))
        else:
            history.status = "failed"
            history.error_message = "Formato de arquivo não suportado."
            db.commit()
            return

        # Normalização: Garantir que as colunas mapeadas existem no DF
        for key, col_name in mapping_dict.items():
            if col_name and col_name not in df.columns:
                history.status = "failed"
                history.error_message = f"Coluna '{col_name}' não encontrada no arquivo."
                db.commit()
                return

        # --- Pré-processamento e Deduplicação ---
        def clean_p(p):
            if pd.isna(p): return ""
            return "".join(filter(str.isdigit, str(p)))

        phone_col = mapping_dict.get('phone')
        df['temp_clean_phone'] = df[phone_col].apply(clean_p)
        df = df[df['temp_clean_phone'].str.len() >= 8]
        df['temp_last_8'] = df['temp_clean_phone'].str[-8:]
        df = df.drop_duplicates(subset=['temp_last_8'], keep='first')

        total_rows = len(df)

        # Retomada: pular linhas já processadas em execução anterior
        already_done = (history.imported_rows or 0) + (history.error_rows or 0)
        if already_done > 0 and already_done < total_rows:
            df = df.iloc[already_done:].reset_index(drop=True)

        history.total_rows = total_rows
        db.commit()

        success_count = history.imported_rows or 0
        error_count = history.error_rows or 0

        # === OTIMIZAÇÃO BULK ===
        # 1. Buscar proj_id UMA VEZ (não por linha)
        active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
        proj_id = active_client.project_id if active_client else None

        # 2. Pré-carregar TODOS os contatos existentes em memória (1 SELECT ao invés de N)
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

        # Índice por últimos 8 dígitos do telefone
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

        BATCH_SIZE = 500
        now = datetime.now(timezone.utc)

        # Tags globais desta importação (pré-computadas, não por linha)
        fixed_tags_list = _split_tags(fixed_tags)
        fixed_remove_list = _split_tags(fixed_remove_tags)
        fixed_tags_list = [t for t in fixed_tags_list if t not in fixed_remove_list]

        to_insert = []
        to_update = []

        for idx, (_, row) in enumerate(df.iterrows()):
            try:
                clean_phone = row['temp_clean_phone']
                last_8 = clean_phone[-8:]

                raw_name = str(row.get(mapping_dict.get('name'))) if mapping_dict.get('name') else None
                name = normalize_name(raw_name)
                if name and str(name).lower() == 'nan':
                    name = None

                email = str(row.get(mapping_dict.get('email'))) if mapping_dict.get('email') else None
                if email and str(email).strip().lower() == 'nan':
                    email = None

                _INVALID_TAG_VALUES = {'nan', 'none', '-', '--', '—', '.', 'n/a', 'na', ''}

                csv_tag = str(row.get(mapping_dict.get('tags'))) if mapping_dict.get('tags') else None
                if csv_tag and csv_tag.strip().lower() in _INVALID_TAG_VALUES:
                    csv_tag = None

                csv_remove = str(row.get(mapping_dict.get('remove_tags'))) if mapping_dict.get('remove_tags') else None
                if csv_remove and csv_remove.strip().lower() in _INVALID_TAG_VALUES:
                    csv_remove = None

                # Tags desta linha: CSV + fixas manuais
                row_tags_add = list(dict.fromkeys(_split_tags(csv_tag) + fixed_tags_list))
                row_tags_del = list(dict.fromkeys(_split_tags(csv_remove) + fixed_remove_list))
                row_tags_add = [t for t in row_tags_add if t not in row_tags_del]

                if last_8 in existing_map:
                    ex = existing_map[last_8]
                    current_tags = _split_tags(ex['tags'])
                    current_tags = [t for t in current_tags if t not in row_tags_del]
                    for t in row_tags_add:
                        if t not in current_tags:
                            current_tags.append(t)

                    update_dict = {
                        'id': ex['id'],
                        'tags': ", ".join(current_tags),
                        'platform': 'manual_bulk',
                        'total_events': (ex['total_events'] or 0) + 1,
                        'last_event_at': now,
                        'updated_at': now,
                    }
                    if name:
                        update_dict['name'] = name
                    if email:
                        update_dict['email'] = email

                    to_update.append(update_dict)
                    existing_map[last_8] = {**ex, 'tags': ", ".join(current_tags), 'total_events': (ex['total_events'] or 0) + 1}
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
                        'tags': ", ".join(row_tags_add) if row_tags_add else None,
                        'total_events': 1,
                        'created_at': now,
                        'updated_at': now,
                    }
                    to_insert.append(insert_dict)
                    existing_map[last_8] = {
                        'id': None,
                        'tags': ", ".join(row_tags_add) if row_tags_add else None,
                        'name': name,
                        'email': email,
                        'total_events': 1,
                    }

                success_count += 1
            except Exception as e:
                print(f"Erro ao importar linha {idx}: {e}")
                error_count += 1

            # Commit em lote a cada BATCH_SIZE linhas
            if (idx + 1) % BATCH_SIZE == 0:
                if to_insert:
                    db.bulk_insert_mappings(models.WebhookLead, to_insert)
                    to_insert.clear()
                if to_update:
                    db.bulk_update_mappings(models.WebhookLead, to_update)
                    to_update.clear()
                history.imported_rows = success_count
                history.error_rows = error_count
                db.commit()

        # Último lote
        if to_insert:
            db.bulk_insert_mappings(models.WebhookLead, to_insert)
        if to_update:
            db.bulk_update_mappings(models.WebhookLead, to_update)

        history.status = "completed"
        history.imported_rows = success_count
        history.error_rows = error_count
        history.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Apagar arquivo temporário após conclusão bem-sucedida
        try:
            if history.file_path and os.path.exists(history.file_path):
                os.remove(history.file_path)
                history.file_path = None
                db.commit()
        except Exception:
            pass

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        try:
            history = db.query(models.ContactImportHistory).filter(models.ContactImportHistory.id == import_id).first()
            if history:
                history.status = "failed"
                history.error_message = str(e)
                history.updated_at = datetime.now(timezone.utc)
                db.commit()
        except:
            pass
    finally:
        db.close()

@router.post("/leads/import/execute", summary="Executar importação de contatos")
async def execute_import(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mapping: str = Form(...), # JSON string do mapeamento
    fixed_tags: Optional[str] = Form(None),        # tags fixas digitadas manualmente
    fixed_remove_tags: Optional[str] = Form(None), # tags a remover digitadas manualmente
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Inicia o processamento do arquivo aplicando o mapeamento de colunas em segundo plano.
    """
    try:
        client_id = x_client_id if x_client_id else current_user.client_id
        mapping_dict = json.loads(mapping) # {"name": "col_a", "phone": "col_b", ...}

        # Buscar projeto associado ao cliente
        active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
        proj_id = active_client.project_id if active_client else None

        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()

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
            fixed_tags=fixed_tags or "",
            fixed_remove_tags=fixed_remove_tags or "",
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
            fixed_tags or "",
            fixed_remove_tags or ""
        )

        return {
            "status": "success",
            "import_id": history.id,
            "message": "Importação iniciada em segundo plano."
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar importação: {str(e)}")

@router.get("/leads/import/history", summary="Obter histórico de importações")
def get_import_history(
    skip: int = 0,
    limit: int = 20,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Retorna o histórico de importações paginado para o cliente ativo (ou do projeto associado).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Verificar se cliente tem projeto associado
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

@router.put("/leads/import/{import_id}/rename", summary="Renomear lista importada")
def rename_import(
    import_id: int,
    request: RenameImportRequest,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Renomeia o arquivo ou lista importada.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
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
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    deleted_count = db.query(models.ContactImportHistory).filter(
        models.ContactImportHistory.id.in_(request.import_ids),
        models.ContactImportHistory.client_id == client_id
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"status": "success", "message": f"{deleted_count} importações deletadas com sucesso."}

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
                    
                clean_phone = re.sub(r"\D", "", str(phone_raw))
                if len(clean_phone) < 8:
                    continue
                    
                name = normalize_name(c.get("name"))
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

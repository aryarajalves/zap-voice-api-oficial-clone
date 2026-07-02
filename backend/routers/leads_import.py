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
from sqlalchemy import desc, or_, func as sa_func
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

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
        import traceback
        print(traceback.format_exc())
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
    Recalcula, para o arquivo INTEIRO (não só as 3 linhas da prévia inicial), como cada
    linha vai virar telefone com o mapeamento atual — seja coluna única ou composto
    (DDI + DDD + Número + DDI manual). Não importa nada, é só para o usuário conferir
    o resultado da junção em todas as linhas antes de confirmar a importação de verdade.
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
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao pré-visualizar telefones: {str(e)}")

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


def _clean_phone_digits(v):
    """Extrai só os dígitos de um valor de célula (trata NaN/None).

    Colunas numéricas (DDI, DDD, telefone) que o Excel/pandas carrega como float
    ficam tipo 11.0 em vez de 11 — sem tratar isso, "".join(dígitos) geraria "110"
    (o "0" da parte decimal grudando no número), corrompendo o telefone final.
    """
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return "".join(filter(str.isdigit, str(v)))


# Linhas sem coluna de DDD preenchida cujo "Número" já tem 10+ dígitos provavelmente já
# são um telefone completo (ex: número internacional, ou a planilha já embutiu o DDD no
# "Número" só nessa linha) — nesses casos NÃO grudamos o DDI em cima, senão corrompe.
_ALREADY_COMPLETE_MIN_LEN = 10


def _resolve_ddi_for_row(ddd_val, num_val, raw_ddi_val, manual_ddi):
    """Decide o DDI a usar para uma linha do mapeamento composto (DDI/DDD/Número).

    Se não há DDD nessa linha e o Número já parece um telefone completo (10+ dígitos),
    não usa nenhum DDI (nem de coluna, nem manual) — o Número é usado como está.
    Caso contrário, usa o DDI da coluna (se preenchido) ou cai para o DDI manual.
    """
    if not ddd_val and len(num_val) >= _ALREADY_COMPLETE_MIN_LEN:
        return ""
    return raw_ddi_val if raw_ddi_val else manual_ddi


def _get_phone_mapping_columns(phone_mapping):
    """
    Retorna a lista de nomes de colunas realmente referenciadas pelo mapeamento de telefone,
    seja ele um nome de coluna simples (string) ou um mapeamento composto (dict) com
    colunas separadas de DDI/DDD/Número.
    """
    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        cols = [phone_mapping.get('ddi_column'), phone_mapping.get('ddd_column'), phone_mapping.get('number_column')]
        return [c for c in cols if c]
    if isinstance(phone_mapping, str) and phone_mapping:
        return [phone_mapping]
    return []


def _build_phone_series(df, phone_mapping):
    """
    Monta a série (coluna) de telefone já limpa (somente dígitos) a partir do mapeamento.

    - Se `phone_mapping` for uma string: usa a coluna diretamente (caso simples, planilha
      já tem uma coluna única com o telefone completo).
    - Se `phone_mapping` for um dict {mode: 'composite', ddi_column, ddd_column,
      number_column, manual_ddi}: concatena DDI + DDD + Número linha a linha. Quando a
      planilha não tem coluna de DDI (ou a célula está vazia numa linha específica), usa
      o `manual_ddi` informado manualmente (ex: "55") para completar o número.
    """
    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        ddi_col = phone_mapping.get('ddi_column') or None
        ddd_col = phone_mapping.get('ddd_column') or None
        num_col = phone_mapping.get('number_column') or None
        manual_ddi = _clean_phone_digits(phone_mapping.get('manual_ddi')) if phone_mapping.get('manual_ddi') else ""

        def compose_row(row):
            ddd_val = _clean_phone_digits(row.get(ddd_col)) if ddd_col else ""
            num_val = _clean_phone_digits(row.get(num_col)) if num_col else ""
            raw_ddi_val = _clean_phone_digits(row.get(ddi_col)) if ddi_col else ""
            ddi_val = _resolve_ddi_for_row(ddd_val, num_val, raw_ddi_val, manual_ddi)
            return f"{ddi_val}{ddd_val}{num_val}"

        return df.apply(compose_row, axis=1)

    # Caso simples: uma única coluna com o telefone completo
    if not phone_mapping or phone_mapping not in df.columns:
        return pd.Series([""] * len(df), index=df.index)
    return df[phone_mapping].apply(_clean_phone_digits)


def _build_phone_components(df, phone_mapping):
    """
    Igual a `_build_phone_series`, mas retorna os 3 pedaços (DDI, DDD, Número) separados
    em vez de já concatenados — usado na prévia visual "maximizada", que mostra cada
    pedaço colorido para o usuário conferir a junção antes de importar de verdade.
    Retorna (ddi_series, ddd_series, number_series), todas já limpas (só dígitos).
    """
    empty = pd.Series([""] * len(df), index=df.index)

    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        ddi_col = phone_mapping.get('ddi_column') or None
        ddd_col = phone_mapping.get('ddd_column') or None
        num_col = phone_mapping.get('number_column') or None
        manual_ddi = _clean_phone_digits(phone_mapping.get('manual_ddi')) if phone_mapping.get('manual_ddi') else ""

        raw_ddi_series = df[ddi_col].apply(_clean_phone_digits) if ddi_col else empty.copy()
        ddd_series = df[ddd_col].apply(_clean_phone_digits) if ddd_col else empty.copy()
        num_series = df[num_col].apply(_clean_phone_digits) if num_col else empty.copy()
        ddi_series = pd.Series(
            [
                _resolve_ddi_for_row(ddd_series.iat[i], num_series.iat[i], raw_ddi_series.iat[i], manual_ddi)
                for i in range(len(df))
            ],
            index=df.index,
        )
        return ddi_series, ddd_series, num_series

    # Caso simples: uma única coluna com o telefone completo (não há DDI/DDD separados)
    num_series = df[phone_mapping].apply(_clean_phone_digits) if (phone_mapping and phone_mapping in df.columns) else empty.copy()
    return empty.copy(), empty.copy(), num_series


def _extract_row_name(row, name_col):
    """Extrai e limpa o nome de uma linha do DataFrame, para exibição nas listas de
    contatos importados/rejeitados de uma importação (ver ImportRowResult)."""
    if not name_col:
        return None
    raw = row.get(name_col)
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    return s if s and s.lower() != 'nan' else None


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
        # (o campo 'phone' pode ser um nome de coluna simples OU um mapeamento
        # composto {mode: 'composite', ddi_column, ddd_column, number_column, manual_ddi} —
        # validado separadamente por _get_phone_mapping_columns)
        for key, col_name in mapping_dict.items():
            if key == 'phone':
                continue
            if col_name and col_name not in df.columns:
                history.status = "failed"
                history.error_message = f"Coluna '{col_name}' não encontrada no arquivo."
                db.commit()
                return

        for col_name in _get_phone_mapping_columns(mapping_dict.get('phone')):
            if col_name not in df.columns:
                history.status = "failed"
                history.error_message = f"Coluna '{col_name}' não encontrada no arquivo."
                db.commit()
                return

        # --- Pré-processamento e Deduplicação ---
        original_total_rows = len(df)
        history.original_total_rows = original_total_rows
        name_col = mapping_dict.get('name')

        df['temp_clean_phone'] = _build_phone_series(df, mapping_dict.get('phone'))

        # Linhas com telefone inválido/incompleto (menos de 8 dígitos após limpeza) —
        # rastreadas ANTES de descartar, para o usuário poder ver quem foi rejeitado e por quê
        # (antes, essas linhas simplesmente desapareciam sem deixar rastro nenhum).
        invalid_mask = df['temp_clean_phone'].str.len() < 8
        invalid_df = df[invalid_mask]
        df = df[~invalid_mask]

        df['temp_last_8'] = df['temp_clean_phone'].str[-8:]

        # Linhas duplicadas dentro do próprio arquivo (mesmo telefone aparecendo mais de uma
        # vez) — mantemos só a primeira ocorrência, mas registramos as demais como rejeitadas.
        dup_mask = df.duplicated(subset=['temp_last_8'], keep='first')
        duplicate_df = df[dup_mask]
        df = df[~dup_mask]

        # Idempotência: se esta função for reexecutada para o mesmo import_id (ex: retomada
        # após restart do servidor), substitui os registros de rejeição em vez de duplicá-los.
        # Os registros de 'imported'/'updated'/'error' do loop principal não são tocados aqui —
        # eles já respeitam o corte de `already_done` mais abaixo.
        db.query(models.ImportRowResult).filter(
            models.ImportRowResult.import_id == import_id,
            models.ImportRowResult.status.in_(['rejected_invalid_phone', 'rejected_duplicate_file'])
        ).delete(synchronize_session=False)

        rejected_dicts = []
        for _, row in invalid_df.iterrows():
            rejected_dicts.append({
                'import_id': import_id,
                'name': _extract_row_name(row, name_col),
                'phone': row['temp_clean_phone'] or None,
                'status': 'rejected_invalid_phone',
                'reason': 'Telefone incompleto ou inválido (menos de 8 dígitos após limpeza).',
            })
        for _, row in duplicate_df.iterrows():
            rejected_dicts.append({
                'import_id': import_id,
                'name': _extract_row_name(row, name_col),
                'phone': row['temp_clean_phone'] or None,
                'status': 'rejected_duplicate_file',
                'reason': 'Telefone duplicado dentro do próprio arquivo importado (mantida apenas a primeira ocorrência).',
            })
        if rejected_dicts:
            db.bulk_insert_mappings(models.ImportRowResult, rejected_dicts)

        history.rejected_invalid_phone_rows = len(invalid_df)
        history.rejected_duplicate_rows = len(duplicate_df)

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
        to_results = []

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
                    to_results.append({
                        'import_id': import_id,
                        'name': name or ex.get('name'),
                        'phone': clean_phone,
                        'status': 'updated',
                        'reason': None,
                    })
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
                    to_results.append({
                        'import_id': import_id,
                        'name': name,
                        'phone': clean_phone,
                        'status': 'imported',
                        'reason': None,
                    })

                success_count += 1
            except Exception as e:
                print(f"Erro ao importar linha {idx}: {e}")
                error_count += 1
                to_results.append({
                    'import_id': import_id,
                    'name': _extract_row_name(row, name_col),
                    'phone': row.get('temp_clean_phone') or None,
                    'status': 'error',
                    'reason': str(e)[:500],
                })

            # Commit em lote a cada BATCH_SIZE linhas
            if (idx + 1) % BATCH_SIZE == 0:
                if to_insert:
                    db.bulk_insert_mappings(models.WebhookLead, to_insert)
                    to_insert.clear()
                if to_update:
                    db.bulk_update_mappings(models.WebhookLead, to_update)
                    to_update.clear()
                if to_results:
                    db.bulk_insert_mappings(models.ImportRowResult, to_results)
                    to_results.clear()
                history.imported_rows = success_count
                history.error_rows = error_count
                db.commit()

        # Último lote
        if to_insert:
            db.bulk_insert_mappings(models.WebhookLead, to_insert)
        if to_update:
            db.bulk_update_mappings(models.WebhookLead, to_update)
        if to_results:
            db.bulk_insert_mappings(models.ImportRowResult, to_results)

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

@router.get("/leads/import/{import_id}/results", summary="Ver contatos importados e rejeitados de uma importação")
def get_import_results(
    import_id: int,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    """
    Lista o resultado linha a linha de uma importação: quais contatos foram
    importados/atualizados e quais foram rejeitados (com o motivo).

    `status`: filtro opcional — 'imported', 'updated', 'error', 'rejected_invalid_phone',
    'rejected_duplicate_file', ou o atalho 'rejected' (junta os dois status de rejeição).
    `search`: busca por nome ou telefone (parcial, case-insensitive).
    """
    client_id = x_client_id if x_client_id else current_user.client_id
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

    # Contagem por status (para as abas/badges na UI, sem precisar de outra chamada)
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


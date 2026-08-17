import os
import io
from datetime import datetime, timezone
import pandas as pd
import models
from core.logger import setup_logger
from .parsers import (
    read_csv_smart,
    normalize_name,
    _parse_datetime_smart,
    _split_tags,
    _get_phone_mapping_columns,
    _build_phone_series,
    _extract_row_name,
)

logger = setup_logger("LeadsImportProcessor")


def process_import_in_bg(
    import_id: int,
    content: bytes,
    file_extension: str,
    mapping_dict: dict,
    client_id: int,
    fixed_tags: str = "",
    fixed_remove_tags: str = ""
):
    """Executa a importação de contatos em segundo plano em lotes otimizados."""
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

        # Linhas com telefone inválido/incompleto (menos de 8 dígitos após limpeza)
        invalid_mask = df['temp_clean_phone'].str.len() < 8
        invalid_df = df[invalid_mask]
        df = df[~invalid_mask]

        df['temp_last_8'] = df['temp_clean_phone'].str[-8:]

        # Linhas duplicadas dentro do próprio arquivo (mantida apenas a primeira ocorrência)
        dup_mask = df.duplicated(subset=['temp_last_8'], keep='first')
        duplicate_df = df[dup_mask]
        df = df[~dup_mask]

        # Idempotência: substitui rejeições anteriores caso seja uma retomada
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
        active_client = db.query(models.Client).filter(models.Client.id == client_id).first()
        proj_id = active_client.project_id if active_client else None

        # Pré-carregar TODOS os contatos existentes em memória (1 SELECT ao invés de N)
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

        BATCH_SIZE = 500
        now = datetime.now(timezone.utc)

        fixed_tags_str = fixed_tags if isinstance(fixed_tags, str) else ""
        fixed_remove_tags_str = fixed_remove_tags if isinstance(fixed_remove_tags, str) else ""

        fixed_tags_list = _split_tags(fixed_tags_str)
        fixed_remove_list = _split_tags(fixed_remove_tags_str)
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

                raw_created_at = row.get(mapping_dict.get('created_at')) if mapping_dict.get('created_at') else None
                parsed_created_at = _parse_datetime_smart(raw_created_at)

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
                        'last_event_at': parsed_created_at or now,
                        'updated_at': now,
                    }
                    if name:
                        update_dict['name'] = name
                    if email:
                        update_dict['email'] = email
                    if parsed_created_at:
                        update_dict['created_at'] = parsed_created_at

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
                        'last_event_at': parsed_created_at or now,
                        'platform': 'manual_bulk',
                        'tags': ", ".join(row_tags_add) if row_tags_add else None,
                        'total_events': 1,
                        'created_at': parsed_created_at or now,
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
                logger.error(f"Erro ao importar linha {idx}: {e}")
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
        logger.error(f"❌ [LEADS IMPORT] Erro ao processar arquivo #{import_id}: {e}")
        try:
            history = db.query(models.ContactImportHistory).filter(models.ContactImportHistory.id == import_id).first()
            if history:
                history.status = "failed"
                history.error_message = str(e)
                history.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

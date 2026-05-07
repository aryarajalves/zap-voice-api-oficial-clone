from fastapi import APIRouter, Depends, HTTPException, Request, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String, text
from typing import List, Optional
from datetime import datetime
import uuid
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
from core.logger import logger
from services.leads import upsert_webhook_lead
from services.webhooks import parse_webhook_payload, replace_variables_in_string, compute_dynamic_manychat_tag, process_webhook_automation
from services.webhooks_execution import execute_webhook_resend_logic, process_bulk_resend_task
from core.utils import robust_extract_labels

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/{integration_id}/history", response_model=List[schemas.WebhookHistory], summary="Listar histórico de recebimento")
def list_webhook_history(
    integration_id: str,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = Query(None),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    query = db.query(models.WebhookHistory).filter(
        cast(models.WebhookHistory.integration_id, String) == str(uuid_obj)
    )
    
    if search and search.strip():
        search = search.strip()
        search_digits = "".join(filter(str.isdigit, search))
        
        filters = [
            cast(models.WebhookHistory.processed_data['name'], String).ilike(f"%{search}%"),
            cast(models.WebhookHistory.processed_data['phone'], String).ilike(f"%{search}%"),
            cast(models.WebhookHistory.payload, String).ilike(f"%{search}%")
        ]
        
        if search_digits and len(search_digits) > 5:
            filters.append(cast(models.WebhookHistory.processed_data['phone'], String).ilike(f"%{search_digits}%"))
            filters.append(cast(models.WebhookHistory.payload, String).ilike(f"%{search_digits}%"))

        query = query.filter(or_(*filters))
    
    history = query.order_by(models.WebhookHistory.created_at.desc()).offset(skip).limit(limit).all()
    return history

@router.put("/history/{history_id}", summary="Editar Payload do JSON do Histórico")
async def edit_webhook_history(
    history_id: int,
    request: Request,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        new_payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    history = db.query(models.WebhookHistory).filter(models.WebhookHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Webhook history not found")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == history.integration_id,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=403, detail="Forbidden")

    parsed_data = parse_webhook_payload(integration.platform, new_payload)

    history.payload = new_payload
    history.processed_data = parsed_data
    db.commit()
    db.refresh(history)

    return {
        "status": "success", 
        "id": history.id,
        "processed_data": parsed_data, 
        "payload": new_payload,
        "event_type": history.event_type
    }

@router.post("/history/{history_id}/resend", summary="Reenviar um webhook do histórico")
async def resend_webhook(
    history_id: int,
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await execute_webhook_resend_logic(history_id, x_client_id, db, background_tasks)
    if result.get("status") == "error":
        if "não encontrado" in result["message"]:
            raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=403, detail=result["message"])
    return result

@router.post("/history/bulk-resend", summary="Reenviar múltiplos webhooks do histórico")
async def bulk_resend_webhook(
    history_ids: List[int],
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    background_tasks.add_task(process_bulk_resend_task, history_ids, x_client_id)
    return {
        "status": "success",
        "message": f"Processamento de {len(history_ids)} registros iniciado em segundo plano."
    }

@router.delete("/{integration_id}/history/{history_id}", summary="Excluir um registro de histórico")
async def delete_webhook_history(
    integration_id: str,
    history_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    history = db.query(models.WebhookHistory).join(
        models.WebhookIntegration, 
        models.WebhookHistory.integration_id == models.WebhookIntegration.id
    ).filter(
        models.WebhookHistory.id == history_id,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
        
    db.delete(history)
    db.commit()
    return {"status": "success"}

@router.delete("/{integration_id}/history/bulk-delete", summary="Excluir múltiplos registros")
async def bulk_delete_webhook_history(
    integration_id: str,
    request: Request,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        data = await request.json()
        history_ids = data.get("ids", [])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id.in_(history_ids),
        models.WebhookHistory.integration_id.in_(
            db.query(models.WebhookIntegration.id).filter(models.WebhookIntegration.client_id == x_client_id)
        )
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"status": "success"}

@router.delete("/{integration_id}/history/clear", summary="Limpar todo o histórico de uma integração")
async def clear_webhook_history(
    integration_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integração não encontrada")
        
    db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == integration.id
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"status": "success"}

@router.post("/history/{history_id}/sync", summary="Sincronizar/Re-processar extração de dados")
async def sync_webhook_history(
    history_id: int,
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    history = db.query(models.WebhookHistory).filter(models.WebhookHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
        
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == history.integration_id,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=403, detail="Forbidden")

    payload = history.payload
    parsed_data = parse_webhook_payload(integration.platform, payload)
    
    history.processed_data = parsed_data
    history.event_type = parsed_data.get("event_type", "").lower()
    
    mapping_exists = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == integration.id,
        models.WebhookEventMapping.event_type == history.event_type
    ).first()
    
    # Fallback para 'outros' se não encontrar o específico
    if not mapping_exists and history.event_type != "outros":
        mapping_exists = db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == integration.id,
            models.WebhookEventMapping.event_type == "outros"
        ).first()
    
    if mapping_exists and history.status == "ignored":
        history.status = "processed"
    elif not mapping_exists and history.status == "processed":
        history.status = "ignored"

    try:
        tag_list = []
        if mapping_exists:
            if mapping_exists.chatwoot_label:
                current_raw = robust_extract_labels(mapping_exists.chatwoot_label)
                if current_raw:
                    tag_list.extend([str(t).strip() for t in current_raw if t])
            if getattr(mapping_exists, "internal_tags", None):
                tag_list.extend([t.strip() for t in mapping_exists.internal_tags.split(',') if t.strip()])
        
        tag = ", ".join(list(dict.fromkeys(tag_list))) if tag_list else None
        upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, event_time=history.created_at, force_time=True, tag=tag)

        # Atualiza as flags de automação no processed_data para o frontend saber o que exibir
        updated_data = dict(history.processed_data or {})
        is_mc_active = getattr(mapping_exists, "manychat_active", False) if mapping_exists else False
        updated_data["manychat_enabled"] = is_mc_active
        updated_data["private_note_enabled"] = bool(getattr(mapping_exists, "private_note", None)) if mapping_exists else False
        updated_data["chatwoot_label"] = getattr(mapping_exists, "chatwoot_label", []) if mapping_exists else []
        updated_data["free_message_enabled"] = getattr(mapping_exists, "send_as_free_message", False) if mapping_exists else False
        
        history.processed_data = updated_data

        if mapping_exists and is_mc_active and parsed_data.get("phone"):
            from services.manychat import sync_to_manychat_and_update_history
            mc_name = replace_variables_in_string(mapping_exists.manychat_name or "{{name}}", history.payload, parsed_data)
            mc_phone = replace_variables_in_string(mapping_exists.manychat_phone or "{{phone}}", history.payload, parsed_data)
            
            if getattr(mapping_exists, "manychat_tag_automation", False):
                mc_tag = compute_dynamic_manychat_tag(mapping_exists)
            else:
                mc_tag = mapping_exists.manychat_tag
            
            background_tasks.add_task(sync_to_manychat_and_update_history, integration.client_id, mc_name, mc_phone, mc_tag, parsed_data.get("email"), history.id)

        # --- RE-EXECUTA AUTOMAÇÃO SE HOUVER MAPPING ---
        if mapping_exists:
            history.error_message = None # Limpa erro anterior
            background_tasks.add_task(
                process_webhook_automation,
                client_id=integration.client_id,
                mapping=mapping_exists,
                variables=parsed_data,
                history_id=history.id
            )
        
    except Exception as e:
        logger.error(f"Erro ao sincronizar lead: {e}")
        history.error_message = str(e)

    db.commit()
    db.refresh(history)
    return history

@router.post("/{integration_id}/history/sync-all", summary="Sincronizar todo o histórico da integração")
async def sync_all_webhook_history(
    integration_id: str,
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    histories = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == uuid_obj
    ).order_by(models.WebhookHistory.created_at.asc()).all()

    mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == uuid_obj
    ).all()
    
    # --- AUTO-FIX: Limpeza de etiquetas bugadas nos mapeamentos ---
    for m in mappings:
        if m.chatwoot_label:
            cleaned = robust_extract_labels(m.chatwoot_label)
            if cleaned != m.chatwoot_label:
                m.chatwoot_label = cleaned
    db.flush()

    mapping_event_types = {m.event_type.lower() for m in mappings}

    count = 0
    for history in histories:
        try:
            if not history.payload: continue
            parsed_data = parse_webhook_payload(integration.platform, history.payload)
            history.processed_data = parsed_data
            history.event_type = parsed_data.get("event_type", "").lower()
            
            if history.event_type in mapping_event_types and history.status == "ignored":
                history.status = "processed"
            elif history.event_type not in mapping_event_types and history.status == "processed":
                history.status = "ignored"

            if (history.status == "error" and history.error_message and "Telefone Ausente" in history.error_message and parsed_data.get("phone")):
                if history.event_type in mapping_event_types:
                    history.status = "processed"
                else:
                    history.status = "ignored"
                history.error_message = None

            if parsed_data.get("phone"):
                # 1. Identifica o mapeamento correspondente (com fallback para outros)
                m_obj = next((m for m in mappings if m.event_type.lower() == history.event_type), None)
                if not m_obj and history.event_type != "outros":
                    m_obj = next((m for m in mappings if m.event_type.lower() == "outros"), None)

                if m_obj:
                    is_mc_active = getattr(m_obj, "manychat_active", False)
                    tag_list = []
                    
                    if m_obj.chatwoot_label:
                        current_raw = robust_extract_labels(m_obj.chatwoot_label)
                        if current_raw:
                            tag_list.extend([str(t).strip() for t in current_raw if t])
                    if getattr(m_obj, "internal_tags", None):
                        tag_list.extend([t.strip() for t in m_obj.internal_tags.split(',') if t.strip()])
                    
                    tag = ", ".join(list(dict.fromkeys(tag_list))) if tag_list else None
                    upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, event_time=history.created_at, force_time=True, tag=tag)

                    # Garante que as flags de automação sejam salvas
                    updated_data = dict(history.processed_data or {})
                    updated_data["manychat_enabled"] = is_mc_active
                    updated_data["private_note_enabled"] = bool(getattr(m_obj, "private_note", None))
                    
                    # Auto-fix na extração do histórico
                    raw_labels = getattr(m_obj, "chatwoot_label", [])
                    updated_data["chatwoot_label"] = robust_extract_labels(raw_labels)
                    
                    updated_data["free_message_enabled"] = getattr(m_obj, "send_as_free_message", False)
                    history.processed_data = updated_data

                    if is_mc_active:
                        from services.manychat import sync_to_manychat_and_update_history
                        mc_name = replace_variables_in_string(m_obj.manychat_name or "{{name}}", history.payload, parsed_data)
                        mc_phone = replace_variables_in_string(m_obj.manychat_phone or "{{phone}}", history.payload, parsed_data)
                        mc_tag = compute_dynamic_manychat_tag(m_obj) if getattr(m_obj, "manychat_tag_automation", False) else m_obj.manychat_tag
                        background_tasks.add_task(sync_to_manychat_and_update_history, integration.client_id, mc_name, mc_phone, mc_tag, parsed_data.get("email"), history.id)
                else:
                    # Se não houver mapeamento, apenas atualiza o lead sem tags
                    upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, event_time=history.created_at, force_time=True)
            
            count += 1
        except Exception as e:
            logger.error(f"Error syncing history {history.id}: {e}")

    db.commit()

    # Limpeza de duplicatas
    deleted_dupes = db.execute(text("""
        DELETE FROM webhook_history
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY
                                integration_id,
                                event_type,
                                (processed_data->>'phone'),
                                (date_trunc('hour', created_at) + INTERVAL '5 min' * FLOOR(EXTRACT(MINUTE FROM created_at) / 5))
                           ORDER BY created_at ASC
                       ) AS rn
                FROM webhook_history
                WHERE integration_id = :integration_id
            ) ranked
            WHERE rn > 1
        )
    """), {"integration_id": str(uuid_obj)}).rowcount
    db.commit()

    return {"status": "success", "synced_count": count, "duplicates_removed": deleted_dupes}

@router.post("/{integration_id}/history/import", summary="Importar histórico de webhooks via JSON")
async def import_webhook_history(
    integration_id: str,
    payloads: List[dict],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    imported_count = 0
    for item in payloads:
        try:
            # Pode ser uma lista de WebhookHistory ou apenas payloads
            raw_payload = item.get("payload") if isinstance(item, dict) and "payload" in item else item
            if not raw_payload: continue
            
            parsed_data = parse_webhook_payload(integration.platform, raw_payload)
            
            # Tentar pegar data do payload ou usar agora
            created_at = datetime.now()
            if "created_at" in item:
                try: created_at = datetime.fromisoformat(item["created_at"].replace('Z', '+00:00'))
                except: pass
            
            new_history = models.WebhookHistory(
                integration_id=uuid_obj,
                payload=raw_payload,
                event_type=parsed_data.get("event_type", "outros").lower(),
                status="ignored", # Começa como ignorado até ser sincronizado
                processed_data=parsed_data,
                created_at=created_at
            )
            db.add(new_history)
            imported_count += 1
        except Exception as e:
            logger.error(f"Erro ao importar item: {e}")

    db.commit()
    return {"status": "success", "imported_count": imported_count}

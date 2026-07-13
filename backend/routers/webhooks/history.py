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
        models.WebhookHistory.integration_id == uuid_obj
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

@router.post("/{integration_id}/history/bulk-delete", summary="Excluir múltiplos registros")
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
    from services.webhooks_utils import apply_custom_mapping_to_parsed_data, extract_nested_custom_fields
    final_vars = apply_custom_mapping_to_parsed_data(payload, parsed_data, integration.custom_fields_mapping)
    custom_vars = extract_nested_custom_fields(payload, integration.custom_fields_mapping) if integration.custom_fields_mapping else {}
    
    # Merge custom mapping outputs to parsed_data dict
    parsed_data.update(final_vars)
    parsed_data["custom_fields"] = custom_vars
    parsed_data["name"] = final_vars.get("name")
    parsed_data["phone"] = final_vars.get("phone")
    parsed_data["email"] = final_vars.get("email")
    parsed_data["product_name"] = final_vars.get("product_name")
    parsed_data["price"] = final_vars.get("price")
    parsed_data["payment_method"] = final_vars.get("payment_method")
    
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
            # Fallback para o Status Principal (event_type) se não houver tags configuradas
            if not tag_list and history.event_type:
                tag_list.append(history.event_type.replace("_", " ").title())
        
        tag = ", ".join(list(dict.fromkeys(tag_list))) if tag_list else None
        parsed_data["created_by_webhook"] = True
        parsed_data["webhook_name"] = integration.name

        # Respeita update_contact_on_trigger do mapeamento (default True quando não há mapeamento)
        should_update_contact = getattr(mapping_exists, "update_contact_on_trigger", True) if mapping_exists else True
        if should_update_contact:
            contact_save_fields = getattr(mapping_exists, "contact_save_fields", None) if mapping_exists else None
            upsert_webhook_lead(
                db, integration.client_id, integration.platform, parsed_data,
                event_time=history.created_at, force_time=True, tag=tag,
                contact_save_fields=contact_save_fields
            )

        # Atualiza as flags de automação no processed_data para o frontend saber o que exibir
        updated_data = dict(history.processed_data or {})
        is_mc_active = getattr(mapping_exists, "manychat_active", False) if mapping_exists else False
        updated_data["manychat_enabled"] = is_mc_active
        updated_data["private_note_enabled"] = bool(getattr(mapping_exists, "private_note", None)) if mapping_exists else False
        updated_data["chatwoot_label"] = getattr(mapping_exists, "chatwoot_label", []) if mapping_exists else []
        updated_data["free_message_enabled"] = getattr(mapping_exists, "send_as_free_message", False) if mapping_exists else False
        updated_data["internal_tags"] = getattr(mapping_exists, "internal_tags", "") if mapping_exists else ""
        
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

    # --- DEDUPLICAÇÃO E UNIFICAÇÃO RETROATIVA EM LOTE (SINCRONIZAR TUDO) ---
    # Identifica e agrupa registros que ocorreram a menos de 60s do registro original do mesmo contato/evento
    parsed_histories = []
    for h in histories:
        if not h.payload:
            continue
        try:
            p_data = parse_webhook_payload(integration.platform, h.payload)
            from services.webhooks_utils import apply_custom_mapping_to_parsed_data
            f_vars = apply_custom_mapping_to_parsed_data(h.payload, p_data, integration.custom_fields_mapping)
            phone = f_vars.get("phone")
            evt = p_data.get("event_type", "").lower() if p_data.get("event_type") else "outros"
            parsed_histories.append({
                "history": h,
                "phone": phone,
                "event_type": evt,
                "created_at": h.created_at
            })
        except Exception:
            continue

    to_delete = []
    consolidated = []

    for ph in parsed_histories:
        h = ph["history"]
        phone = ph["phone"]
        evt = ph["event_type"]
        created_at = ph["created_at"]

        if not phone:
            consolidated.append(h)
            continue

        # Procura se existe algum registro consolidado que seja do mesmo telefone, mesmo evento,
        # e cuja diferença de tempo seja menor ou igual a 60 segundos
        found_parent = None
        for parent in consolidated:
            parent_ph = next((x for x in parsed_histories if x["history"].id == parent.id), None)
            if parent_ph and parent_ph["phone"] == phone and parent_ph["event_type"] == evt:
                diff = abs((created_at - parent.created_at).total_seconds())
                if diff <= 60:
                    found_parent = parent
                    break

        if found_parent:
            # Se achou um pai correspondente nos últimos 60 segundos, incrementa o contador e agenda deleção do atual
            found_parent.duplicate_count = (found_parent.duplicate_count or 0) + (h.duplicate_count or 0) + 1
            to_delete.append(h)
        else:
            consolidated.append(h)

    # Executa a deleção física dos duplicados para limpar a interface e dados redundantes
    if to_delete:
        for h_del in to_delete:
            db.delete(h_del)
        db.commit()
        logger.info(f"🧹 [SYNC-ALL-DEDUP] {len(to_delete)} registros de webhook duplicados unificados e deletados.")

    # Prossegue o fluxo apenas com a lista de registros consolidados
    histories = consolidated

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
            from services.webhooks_utils import apply_custom_mapping_to_parsed_data, extract_nested_custom_fields
            final_vars = apply_custom_mapping_to_parsed_data(history.payload, parsed_data, integration.custom_fields_mapping)
            custom_vars = extract_nested_custom_fields(history.payload, integration.custom_fields_mapping) if integration.custom_fields_mapping else {}
            
            parsed_data.update(final_vars)
            parsed_data["custom_fields"] = custom_vars
            parsed_data["name"] = final_vars.get("name")
            parsed_data["phone"] = final_vars.get("phone")
            parsed_data["email"] = final_vars.get("email")
            parsed_data["product_name"] = final_vars.get("product_name")
            parsed_data["price"] = final_vars.get("price")
            parsed_data["payment_method"] = final_vars.get("payment_method")
            
            history.processed_data = parsed_data
            history.event_type = parsed_data.get("event_type", "").lower()

            # Atualiza error_message se ela referencia um event_type desatualizado
            if (history.error_message
                    and "Nenhum mapeamento encontrado para o evento:" in history.error_message
                    and history.error_message != f"Nenhum mapeamento encontrado para o evento: {history.event_type}"):
                history.error_message = f"Nenhum mapeamento encontrado para o evento: {history.event_type}"

            if history.event_type in mapping_event_types and history.status == "ignored":
                history.status = "processed"
            elif history.event_type not in mapping_event_types and history.status == "processed":
                history.status = "ignored"

            # --- AUTO-FIX: Registros 'pending' sem mapeamento ativo → 'skipped' ---
            # Cobre webhooks de teste gravados antes da correção do endpoint /test
            if history.status == "pending":
                active_mapping = next(
                    (m for m in mappings
                     if m.event_type.lower() == history.event_type
                     and getattr(m, "is_active", True)),
                    None
                )
                if not active_mapping:
                    history.status = "skipped"
                    history.error_message = (
                        f"Nenhum mapeamento encontrado para o evento: {history.event_type}"
                    )
                    logger.info(f"🔄 [SYNC-ALL] Histórico #{history.id} reclassificado: pending → skipped (sem mapeamento ativo)")

            if (history.status == "error" and history.error_message and "Telefone Ausente" in history.error_message and parsed_data.get("phone")):
                if history.event_type in mapping_event_types:
                    history.status = "processed"
                else:
                    history.status = "ignored"
                history.error_message = None

            if parsed_data.get("phone"):
                parsed_data["created_by_webhook"] = True
                parsed_data["webhook_name"] = integration.name
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
                    # Fallback para o Status Principal (event_type) se não houver tags configuradas
                    if not tag_list and history.event_type:
                        tag_list.append(history.event_type.replace("_", " ").title())

                    tag = ", ".join(list(dict.fromkeys(tag_list))) if tag_list else None

                    # Respeita update_contact_on_trigger do mapeamento
                    if getattr(m_obj, "update_contact_on_trigger", True):
                        upsert_webhook_lead(
                            db, integration.client_id, integration.platform, parsed_data,
                            event_time=history.created_at, force_time=True, tag=tag,
                            contact_save_fields=getattr(m_obj, "contact_save_fields", None)
                        )

                    # Garante que as flags de automação sejam salvas
                    updated_data = dict(history.processed_data or {})
                    updated_data["manychat_enabled"] = is_mc_active
                    updated_data["private_note_enabled"] = bool(getattr(m_obj, "private_note", None))
                    
                    # Auto-fix na extração do histórico
                    raw_labels = getattr(m_obj, "chatwoot_label", [])
                    updated_data["chatwoot_label"] = robust_extract_labels(raw_labels)
                    
                    updated_data["free_message_enabled"] = getattr(m_obj, "send_as_free_message", False)
                    updated_data["internal_tags"] = getattr(m_obj, "internal_tags", "") if m_obj else ""
                    history.processed_data = updated_data

                    if is_mc_active:
                        from services.manychat import sync_to_manychat_and_update_history
                        mc_name = replace_variables_in_string(m_obj.manychat_name or "{{name}}", history.payload, parsed_data)
                        mc_phone = replace_variables_in_string(m_obj.manychat_phone or "{{phone}}", history.payload, parsed_data)
                        mc_tag = compute_dynamic_manychat_tag(m_obj) if getattr(m_obj, "manychat_tag_automation", False) else m_obj.manychat_tag
                        background_tasks.add_task(sync_to_manychat_and_update_history, integration.client_id, mc_name, mc_phone, mc_tag, parsed_data.get("email"), history.id)
                else:
                    # Sem mapeamento → atualiza o lead sem tags (comportamento padrão)
                    upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, event_time=history.created_at, force_time=True, contact_save_fields=None)
            
            count += 1
        except Exception as e:
            logger.error(f"Error syncing history {history.id}: {e}")

    db.commit()

    return {"status": "success", "synced_count": count}

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

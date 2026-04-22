from fastapi import APIRouter, Request, Body, BackgroundTasks, Depends, HTTPException
from utils import normalize_phone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from core.security import limiter
from services.engine import execute_funnel, log_node_execution
import models
from datetime import datetime, timezone, timedelta
import json
import os
import hmac
import hashlib
from core.logger import setup_logger
from rabbitmq_client import rabbitmq
from chatwoot_client import ChatwootClient
from core.utils import get_nested, extract_value_by_path, format_phone, find_phone_in_payload, find_name_in_payload

logger = setup_logger(__name__)

router = APIRouter()


def _check_hmac_signature(body: bytes, secret: str, signature_header: str) -> bool:
    """
    Valida assinatura HMAC-SHA256.
    Retorna True se válida, ou True se o segredo não estiver configurado (modo permissivo).
    Formato esperado do header: 'sha256=<hex_digest>'
    """
    if not secret:
        return True  # Sem segredo configurado, pula a validação
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not signature_header:
        return False
    received = signature_header[7:] if signature_header.startswith("sha256=") else signature_header
    if not received:
        return False
    return hmac.compare_digest(expected, received)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/webhooks/old-catch/{slug}")
async def catch_webhook_deprecated(slug: str, request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Endpoint genérico para receber Webhooks de sistemas externos (Hotmart, Eduzz, etc.)
    """
    webhook = db.query(models.WebhookConfig).filter(models.WebhookConfig.slug == slug).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # 0. Idempotency Check
    import hashlib
    payload_str = json.dumps(payload, sort_keys=True)
    external_id = payload.get("id") or payload.get("event_id") or hashlib.md5(payload_str.encode()).hexdigest()
    
    existing = db.query(models.WebhookEvent).filter(
        models.WebhookEvent.webhook_id == webhook.id,
        models.WebhookEvent.external_id == str(external_id)
    ).first()
    
    if existing:
        logger.info(f"♻️ Webhook already processed (external_id={external_id}). Skipping.")
        return {"status": "ignored", "message": "Duplicate event"}

    # 1. Registrar Evento (Log)
    event = models.WebhookEvent(
        webhook_id=webhook.id,
        external_id=str(external_id),
        payload=payload,
        headers=dict(request.headers),
        status="processing"
    )
    
    try:
        db.add(event)
        db.commit()
        db.refresh(event)
        
        # Opcional: Notificar Frontend via WS para "Modo de Escuta"
        from websocket_manager import manager
        await manager.broadcast({
            "event": "webhook_caught",
            "data": {
                "id": event.id,
                "webhook_id": webhook.id,
                "slug": slug,
                "payload": payload,
                "headers": dict(request.headers)
            }
        })
        
        print(f"DEBUG: Event created. ID: {event.id}, Status: {event.status}")
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR saving WebhookEvent: {e}")
        db.rollback()
        return {"status": "error", "message": f"Database error: {e}"}
    
    try:
        # Update Stats
        webhook.total_received += 1
        webhook.last_payload = payload
        
        # 2. Processar Mapeamento
        mapping = webhook.field_mapping or {}
        phone_path = mapping.get("phone_field")
        name_path = mapping.get("name_field")
        
        # Helper para extrair do JSON (suporta notação ponto: buyer.phone)
        # Replaced local get_nested with import from core.utils

        phone = get_nested(payload, phone_path)
        name = get_nested(payload, name_path)
        
        if not phone:
            print(f"DEBUG: Phone not found. Marking event {event.id} as failed.")
            event.status = "failed"
            event.error_message = "Phone field not found in payload"
            webhook.total_errors += 1
            db.add(event) # Re-add just in case
            db.commit()
            return {"status": "error", "message": "Phone field not found"}

        # Limpeza telefone
        clean_phone = ''.join(filter(str.isdigit, str(phone)))
        
        # 3. Detectar Status e Calcular Delay
        status_path = mapping.get("status_field")
        raw_status = get_nested(payload, status_path) if status_path else (payload.get("status") or payload.get("Status"))
        status_str = str(raw_status).lower() if raw_status else ""
        
        is_approved = any(x in status_str for x in ["aprovada", "approved", "complete", "paid", "pago"])
        
        delay_sec = 0
        if is_approved and webhook.approved_delay_amount:
            amount = webhook.approved_delay_amount
            unit = (webhook.approved_delay_unit or "seconds").lower()
            if "minute" in unit: delay_sec = amount * 60
            elif "hour" in unit: delay_sec = amount * 3600
            else: delay_sec = amount
        elif webhook.delay_amount:
            amount = webhook.delay_amount
            unit = (webhook.delay_unit or "seconds").lower()
            if "minute" in unit: delay_sec = amount * 60
            elif "hour" in unit: delay_sec = amount * 3600
            else: delay_sec = amount

        scheduled_time = datetime.now(timezone.utc)
        if delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=delay_sec)
            logger.info(f"⏳ [WEBHOOK OLD] Delay aplicado: {delay_sec}s para status '{status_str}' (Aprovada: {is_approved})")

        # 4. Disparar Funil
        trigger = models.ScheduledTrigger(
            client_id=webhook.client_id,
            funnel_id=webhook.funnel_id,
            contact_phone=clean_phone,
            contact_name=str(name) if name else None,
            status='queued' if delay_sec > 0 else 'queued', # Status remains queued, scheduler will pick it up
            scheduled_time=scheduled_time
        )
        db.add(trigger)
        
        event.status = "processed"
        event.processed_at = datetime.now(timezone.utc)
        webhook.total_processed += 1
        
        db.commit()
        
        # Forwarding (Opcional)
        if webhook.forward_url:
            # TODO: Async fire and forget
            pass

        return {"status": "success", "trigger_id": trigger.id, "scheduled_at": scheduled_time.isoformat()}

    except Exception as e:
        db.rollback()
        event.status = "failed"
        event.error_message = str(e)
        webhook.total_errors += 1
        db.commit()
        logger.error(f"Error processing webhook {slug}: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/webhooks/{webhook_id}/events")
@router.get("/webhooks/{webhook_id}/events/")
async def list_webhook_events(webhook_id: str, db: Session = Depends(get_db)):
    events = db.query(models.WebhookEvent).filter(
        models.WebhookEvent.webhook_id == webhook_id
    ).order_by(models.WebhookEvent.created_at.desc()).limit(50).all()
    return events

# Mapeamento do incoming_webhooks substituído por core.utils

@router.post("/webhooks/events/{event_id}/retry")
async def retry_webhook_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.WebhookEvent).filter(models.WebhookEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Increment retry
    event.retry_count += 1
    db.commit()
    
    # Re-process LOGIC (Usando as mesmas funcoes do incoming_webhooks)
    webhook = event.webhook
    try:
        mapping = webhook.field_mapping or {}
        payload = event.payload
        
        # 1. Extrair Dados (Mesma lógica do catch_webhook)
        phone_key = mapping.get("phone_field")
        raw_phone, phone_matched = find_phone_in_payload(payload, phone_key)
        
        name_key = mapping.get("name_field")
        name, name_matched = find_name_in_payload(payload, name_key)
        
        # 2. Custom Vars & Translations
        custom_vars = {}
        custom_vars_paths = {}
        translations = mapping.get("translations", {})
        if mapping.get("custom_variables"):
            for var_name, json_path in mapping["custom_variables"].items():
                 val, matched_p = extract_value_by_path(payload, json_path)
                 if val:
                    val_str = str(val).strip()
                    if var_name in translations:
                        field_trans = translations[var_name]
                        if val_str in field_trans:
                            val_str = field_trans[val_str]
                        elif val_str.upper() in field_trans:
                            val_str = field_trans[val_str.upper()]
                    custom_vars[var_name] = val_str
                    custom_vars_paths[var_name] = matched_p

        if not raw_phone:
            # Update event even on failure to show what was tried
            event.processed_data = {
                "extracted_phone": {"value": None, "path": phone_key, "matched": phone_matched},
                "extracted_name": {"value": name, "path": name_key, "matched": name_matched},
            }
            db.add(event)
            db.commit()
            return {"status": "error", "message": "Phone still missing"}

        # 3. Formatar Telefone e País
        country_or_path = mapping.get("default_ddi", "Brasil")
        country_matched = "static"
        if "." in country_or_path and country_or_path not in ["Brasil", "Portugal", "Espanha", "Estados Unidos"]:
             extracted, matched_p = extract_value_by_path(payload, country_or_path)
             if extracted and isinstance(extracted, str):
                 country = extracted
                 country_matched = matched_p
             else:
                 country = "Brasil"
        else:
             country = country_or_path

        clean_phone = format_phone(raw_phone, country)
        
        # 4. Assegurar conversa no Chatwoot (Importante para o envio)
        chatwoot = ChatwootClient(client_id=webhook.client_id)
        conv_res = await chatwoot.ensure_conversation(clean_phone, name)
        convo_id = conv_res.get("conversation_id") if conv_res else None

        # --- LÓGICA DE ROTEAMENTO CONDICIONAL ---
        final_funnel_id = webhook.funnel_id
        conditional = mapping.get("conditional_routing")
        routing_debug = {"triggered": False}
        
        if conditional and conditional.get("field_path") and conditional.get("rules"):
            check_path = conditional["field_path"]
            
            # 1. Prioridade: Verificar se o campo é uma variável já mapeada e traduzida
            if check_path in custom_vars:
                check_value = str(custom_vars[check_path]).strip()
                check_path_matched = f"variable:{check_path}"
            elif check_path == "phone":
                check_value = str(clean_phone).strip()
                check_path_matched = "variable:phone"
            elif check_path == "name":
                check_value = str(name).strip()
                check_path_matched = "variable:name"
            else:
                # 2. Fallback: Extrair diretamente do JSON (JSON Path)
                check_value_raw, check_path_matched = extract_value_by_path(payload, check_path)
                check_value = str(check_value_raw or "").strip()
                
                # Tentar aplicar tradução se o path coincidir com alguma custom_variable
                if mapping.get("custom_variables"):
                    for var_name, json_path in mapping["custom_variables"].items():
                        if json_path == check_path:
                             if var_name in translations:
                                 field_trans = translations[var_name]
                                 if check_value in field_trans:
                                     check_value = field_trans[check_value]
                                 elif check_value.upper() in field_trans:
                                     check_value = field_trans[check_value.upper()]
                             break

            for rule in conditional["rules"]:
                rule_val = str(rule.get("value") or "").strip()
                if rule_val.lower() == check_value.lower():
                    target_funnel = rule.get("funnel_id")
                    if target_funnel:
                        final_funnel_id = int(target_funnel)
                        routing_debug = {
                            "triggered": True,
                            "field": check_path,
                            "field_matched": check_path_matched,
                            "value_found": check_value,
                            "matched_rule": rule_val,
                            "target_funnel": target_funnel
                        }
                        break

        trigger = models.ScheduledTrigger(
            client_id=webhook.client_id,
            funnel_id=final_funnel_id,
            conversation_id=convo_id,
            contact_phone=clean_phone,
            contact_name=str(name) if name else None,
            status='queued',
            template_components=custom_vars,
            scheduled_time=datetime.now(timezone.utc)
        )
        db.add(trigger)
        event.status = "processed"
        event.processed_at = datetime.now(timezone.utc)
        event.error_message = None
        
        # Build info for frontend
        processed_data_builder = {
            "extracted_phone": {"value": clean_phone, "path": phone_key, "matched": phone_matched},
            "extracted_name": {"value": name, "path": name_key, "matched": name_matched},
            "country_used": {"value": country, "path": country_or_path, "matched": country_matched}
        }
        
        custom_data = {}
        if mapping.get("custom_variables"):
             for k, v in custom_vars.items():
                 path_defined = mapping["custom_variables"].get(k)
                 custom_data[k] = {"value": v, "path": path_defined, "matched": custom_vars_paths.get(k)}
        
        processed_data_builder["custom_vars"] = custom_data
        if routing_debug.get("triggered"):
            processed_data_builder["routing_info"] = routing_debug
            
        event.processed_data = processed_data_builder
        db.add(event)
        
        # === SALVAR NO STATUS_INFO (RETRY TAMBÉM ATUALIZA) ===
        product_name_path = mapping.get("product_name_field")
        p_name = None
        if product_name_path:
            p_name_raw, _ = extract_value_by_path(payload, product_name_path)
            if p_name_raw:
                p_name = str(p_name_raw).strip()
        
        if not p_name:
            p_name = custom_vars.get("product_name") or custom_vars.get("produto")
        
        p_status = custom_vars.get("status") or custom_vars.get("Status")

        if clean_phone:
            try:
                # 1. Garantir colunas dinâmicas
                existing_cols_result = db.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'status_info'"
                ))
                existing_cols = {row[0] for row in existing_cols_result}
                
                for var_key in custom_vars.keys():
                    safe_col = ''.join(c for c in var_key.lower().replace(' ', '_') if c.isalnum() or c == '_')
                    if safe_col and safe_col not in existing_cols:
                        try:
                            db.execute(text(f'ALTER TABLE status_info ADD COLUMN "{safe_col}" VARCHAR'))
                            db.commit()
                            existing_cols.add(safe_col)
                            logger.info(f"📊 [STATUS_INFO RETRY] Coluna '{safe_col}' criada")
                        except Exception as col_err:
                            db.rollback()
                            logger.warning(f"⚠️ [STATUS_INFO RETRY] Coluna já existe: {col_err}")
                
                # 2. Upsert
                if p_name and p_status:
                    check_query = text("""
                        SELECT id FROM status_info 
                        WHERE client_id = :client_id AND phone = :phone 
                        AND product_name = :product_name AND status = :status
                        LIMIT 1
                    """)
                    existing = db.execute(check_query, {
                        "client_id": webhook.client_id,
                        "phone": clean_phone,
                        "product_name": p_name,
                        "status": p_status
                    }).fetchone()
                    
                    if existing:
                        # UPDATE
                        update_parts = ["updated_at = NOW()", "name = :name"]
                        update_params = {
                            "name": name,
                            "row_id": existing[0]
                        }
                        for var_key, var_val in custom_vars.items():
                            safe_col = ''.join(c for c in var_key.lower().replace(' ', '_') if c.isalnum() or c == '_')
                            if safe_col in existing_cols and safe_col not in ('status', 'phone', 'name', 'product_name'):
                                update_parts.append(f'"{safe_col}" = :{safe_col}')
                                update_params[safe_col] = str(var_val)
                        
                        update_sql = f"UPDATE status_info SET {', '.join(update_parts)} WHERE id = :row_id"
                        db.execute(text(update_sql), update_params)
                        logger.info(f"🔄 [STATUS_INFO RETRY] Atualizado: {clean_phone} -> {p_name} ({p_status})")
                    else:
                        # INSERT
                        col_names = ["client_id", "webhook_id", "phone", "name", "product_name", "status"]
                        col_values = [":client_id", ":webhook_id", ":phone", ":name", ":product_name", ":status"]
                        insert_params = {
                            "client_id": webhook.client_id,
                            "webhook_id": webhook.id,
                            "phone": clean_phone,
                            "name": name,
                            "product_name": p_name,
                            "status": p_status
                        }
                        for var_key, var_val in custom_vars.items():
                            safe_col = ''.join(c for c in var_key.lower().replace(' ', '_') if c.isalnum() or c == '_')
                            if safe_col in existing_cols and safe_col not in ('status', 'phone', 'name', 'product_name'):
                                col_names.append(f'"{safe_col}"')
                                col_values.append(f":{safe_col}")
                                insert_params[safe_col] = str(var_val)
                        
                        insert_sql = f"INSERT INTO status_info ({', '.join(col_names)}) VALUES ({', '.join(col_values)})"
                        db.execute(text(insert_sql), insert_params)
                        logger.info(f"✨ [STATUS_INFO RETRY] Novo registro: {clean_phone} -> {p_name} ({p_status})")
                elif p_name or p_status:
                    # Registro parcial
                    col_names = ["client_id", "webhook_id", "phone", "name", "product_name", "status"]
                    col_values = [":client_id", ":webhook_id", ":phone", ":name", ":product_name", ":status"]
                    insert_params = {
                        "client_id": webhook.client_id,
                        "webhook_id": webhook.id,
                        "phone": clean_phone,
                        "name": name,
                        "product_name": p_name or "",
                        "status": p_status or ""
                    }
                    for var_key, var_val in custom_vars.items():
                        safe_col = ''.join(c for c in var_key.lower().replace(' ', '_') if c.isalnum() or c == '_')
                        if safe_col in existing_cols and safe_col not in ('status', 'phone', 'name', 'product_name'):
                            col_names.append(f'"{safe_col}"')
                            col_values.append(f":{safe_col}")
                            insert_params[safe_col] = str(var_val)
                    
                    insert_sql = f"INSERT INTO status_info ({', '.join(col_names)}) VALUES ({', '.join(col_values)})"
                    db.execute(text(insert_sql), insert_params)
                    logger.info(f"✨ [STATUS_INFO RETRY] Parcial: {clean_phone} -> {p_name or 'N/A'} ({p_status or 'N/A'})")
                    
            except Exception as status_err:
                logger.error(f"❌ [STATUS_INFO RETRY] Erro: {status_err}")
                db.rollback()
        # === FIM STATUS_INFO ===
        
        db.commit()
        
        return {"status": "retried", "trigger_id": trigger.id}
        
    except Exception as e:
        return {"status": "failed", "error": str(e)}

def recalculate_webhook_stats(webhook_id: str, db: Session):
    """
    Recalcula as estatísticas (received, processed, errors) de um webhook
    baseado nos eventos existentes no banco de dados.
    """
    try:
        webhook = db.query(models.WebhookConfig).filter(models.WebhookConfig.id == webhook_id).first()
        if not webhook:
            logger.warning(f"⚠️ [WEBHOOK STATS] Webhook {webhook_id} not found for stats update.")
            return

        # Count all events
        total = db.query(models.WebhookEvent).filter(models.WebhookEvent.webhook_id == webhook_id).count()
        
        # Count processed
        processed = db.query(models.WebhookEvent).filter(
            models.WebhookEvent.webhook_id == webhook_id,
            models.WebhookEvent.status == 'processed'
        ).count()
        
        # Count errors
        errors = db.query(models.WebhookEvent).filter(
            models.WebhookEvent.webhook_id == webhook_id,
            models.WebhookEvent.status == 'failed'
        ).count()
        
        logger.info(f"📊 [WEBHOOK STATS] Recalculating for ID {webhook_id}: Received={total}, Processed={processed}, Errors={errors} (Old: {webhook.total_received}/{webhook.total_processed}/{webhook.total_errors})")
        
        webhook.total_received = total
        webhook.total_processed = processed
        webhook.total_errors = errors
        db.add(webhook)
        db.commit()
        db.refresh(webhook)
        
    except Exception as e:
        logger.error(f"❌ [WEBHOOK STATS] Error recalculating stats: {e}")
        db.rollback()

@router.delete("/webhooks/events/{event_id}")
async def delete_webhook_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.WebhookEvent).filter(models.WebhookEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    webhook_id = event.webhook_id
    db.delete(event)
    db.commit()
    
    # Recalcula stats após deleção
    recalculate_webhook_stats(webhook_id, db)
    
    return {"message": "Event deleted"}

@router.post("/webhooks/events/bulk-delete")
async def bulk_delete_webhook_events(event_ids: List[int] = Body(...), db: Session = Depends(get_db)):
    if not event_ids:
        return {"message": "No events provided"}
    
    # Descobrir quais webhooks serão afetados para recalcular
    # Fazemos uma query para pegar os IDs distintos de webhook desses eventos antes de apagar
    webhook_ids = db.query(models.WebhookEvent.webhook_id).filter(
        models.WebhookEvent.id.in_(event_ids)
    ).distinct().all()
    
    # Extrair lista de IDs de tuplas
    affected_webhook_ids = [w[0] for w in webhook_ids]
    
    db.query(models.WebhookEvent).filter(models.WebhookEvent.id.in_(event_ids)).delete(synchronize_session=False)
    db.commit()
    
    # Recalcular stats para todos os webhooks afetados
    for wid in affected_webhook_ids:
        recalculate_webhook_stats(wid, db)
        
    return {"message": f"{len(event_ids)} events deleted"}

@router.post("/webhooks/n8n/trigger")
@limiter.limit("2000/minute")
async def n8n_trigger_webhook(
    request: Request,
    payload: dict = Body(...), 
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Recebe um JSON do N8N e dispara funis para os contatos.
    """
    contacts = payload.get("contacts", [])
    if not contacts:
        return {"error": "No contacts provided"}
    
    forced_funnel_id = payload.get("funnel_id")
    
    # Estatísticas de processamento
    triggered_count = 0
    skipped_count = 0
    results = []
    
    for contact in contacts:
        phone = contact.get("phone")
        button_context = contact.get("button_context", "").strip()
        
        if not phone:
            skipped_count += 1
            results.append({"phone": "unknown", "status": "skipped", "reason": "no_phone"})
            continue
        
        # Limpar o telefone (remover caracteres não numéricos)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Se foi especificado um funil, usa ele
        if forced_funnel_id:
            funnel = db.query(models.Funnel).filter(models.Funnel.id == forced_funnel_id).first()
            if not funnel:
                skipped_count += 1
                results.append({"phone": clean_phone, "status": "skipped", "reason": "funnel_not_found"})
                continue
            
            # Criar trigger
            trigger = models.ScheduledTrigger(
                contact_phone=clean_phone,
                client_id=funnel.client_id,
                parent_id=payload.get("parent_id"), # Support for linkage
                product_name="HIDDEN_CHILD" if payload.get("parent_id") else payload.get("product_name"),
                status='queued',
                scheduled_time=datetime.now(timezone.utc),
                is_bulk=False
            )
            db.add(trigger)
            triggered_count += 1
            results.append({
                "phone": clean_phone,
                "status": "triggered",
                "funnel_id": funnel.id,
                "funnel_name": funnel.name
            })
            logger.info(f"🎯 Funil '{funnel.name}' agendado para {clean_phone} (forçado)")
        
        # Caso contrário, busca funil pelo button_context (trigger_phrase)
        elif button_context:
            matched_funnel = db.query(models.Funnel).filter(
                models.Funnel.trigger_phrase == button_context
            ).first()
            
            if matched_funnel:
                # Criar trigger
                trigger = models.ScheduledTrigger(
                    funnel_id=matched_funnel.id,
                    contact_phone=clean_phone,
                    client_id=matched_funnel.client_id,
                    status='queued',
                    scheduled_time=datetime.now(timezone.utc),
                    parent_id=payload.get("parent_id"), # Link to parent if provided
                    product_name="HIDDEN_CHILD" if payload.get("parent_id") else f"Gatilho: {button_context}",
                    is_bulk=False
                )
                db.add(trigger)
                triggered_count += 1
                results.append({
                    "phone": clean_phone,
                    "status": "triggered",
                    "funnel_id": matched_funnel.id,
                    "funnel_name": matched_funnel.name,
                    "matched_by": button_context
                })
                logger.info(f"🎯 Funil '{matched_funnel.name}' agendado para {clean_phone} (gatilho: '{button_context}')")
            else:
                skipped_count += 1
                results.append({
                    "phone": clean_phone,
                    "status": "skipped",
                    "reason": "no_matching_funnel",
                    "button_context": button_context
                })
                logger.warning(f"⚠️ Nenhum funil encontrado para o gatilho '{button_context}' (contato: {clean_phone})")
        else:
            skipped_count += 1
            results.append({
                "phone": clean_phone,
                "status": "skipped",
                "reason": "no_button_context_or_funnel_id"
            })
    
    # Commit das alterações
    db.commit()
    
    return {
        "status": "processed",
        "total_contacts": len(contacts),
        "triggered": triggered_count,
        "skipped": skipped_count,
        "results": results
    }


@router.post("/webhooks/n8n/button-click")
@limiter.limit("2000/minute")
async def button_click_webhook(
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Recebe cliques de botão do WhatsApp via n8n.
    """
    phone = payload.get("phone")
    button_context = payload.get("button_context")
    button_id = payload.get("button_id", "unknown")
    message_id = payload.get("message_id")
    
    if not phone:
        return {"error": "Phone number is required"}
    
    if not button_context:
        return {"error": "Button context is required"}
    
    # Log do clique
    logger.info(f"📱 Button Click Received: {phone} clicked '{button_context}' (ID: {button_id})")
    
    return {
        "status": "button_click_logged",
        "phone": phone,
        "button_context": button_context,
        "message": "Clique registrado com sucesso! Configure um funil para processar essa ação."
    }


@router.get("/webhooks/ping")
@router.get("/webhooks/ping/")
async def ping_webhook():
    return {"status": "ok", "version": "1.2.0-robust-match", "timestamp": datetime.now(timezone.utc)}

@router.post("/webhooks/chatwoot")
@router.post("/webhooks/chatwoot_events")
@limiter.limit("5000/minute")
async def chatwoot_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    chatwoot_secret = os.getenv("CHATWOOT_WEBHOOK_SECRET", "")
    if chatwoot_secret:
        body = await request.body()
        signature = request.headers.get("X-Chatwoot-Signature", "")
        if not _check_hmac_signature(body, chatwoot_secret, signature):
            logger.warning("❌ Chatwoot webhook: assinatura HMAC inválida — requisição rejeitada")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_type = payload.get("event")
    # Log IMEDIATO com timestamp preciso
    log_msg = f"📥 [CHATWOOT] {datetime.now(timezone.utc)} | Event: {event_type}"
    logger.info(log_msg)
    
    # Salva no arquivo
    try:
        with open("webhooks_incoming.log", "a", encoding="utf-8") as f:
            f.write(f"{log_msg} | Payload: {json.dumps(payload)}\n")
    except:
        pass

    # Salva no DB para verificação remota
    try:
        from models import AppConfig
        debug_json = json.dumps({"timestamp": str(datetime.now(timezone.utc)), "payload": payload})
        existing = db.query(AppConfig).filter(AppConfig.key == "DEBUG_CHATWOOT_LAST").first()
        if existing: existing.value = debug_json
        else: db.add(AppConfig(client_id=1, key="DEBUG_CHATWOOT_LAST", value=debug_json))
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao salvar debug chatwoot: {e}")

    # 1. Mensagem Criada (Gatilho de Funil)
    # E TAMBÉM Sincronização de Contato para ambos In/Out
    if event_type == "message_created":
        msg_type = payload.get("message_type") # incoming / outgoing

        # --- SYNC / CACHE / TRIGGER ---
        if msg_type in ["incoming", "outgoing", 0, 1]:
            try:
                # 1. Resolução Robusta de Telefone e Nome
                account_id = payload.get("account", {}).get("id")
                inbox_id = payload.get("inbox", {}).get("id")
                conversation = payload.get("conversation", {})
                sender = payload.get("sender", {})
                
                phone_number = sender.get("phone_number")
                display_name = sender.get("name")
                
                if not phone_number:
                    # Fallback meta sender
                    phone_number = conversation.get("meta", {}).get("sender", {}).get("phone_number")
                if not phone_number:
                    # Fallback contact_inbox
                    phone_number = conversation.get("contact_inbox", {}).get("source_id")
                
                if phone_number:
                    clean_phone = "".join(filter(str.isdigit, str(phone_number)))
                    
                    # 2. Resolução de Client ID
                    client_id = 1 
                    config = db.query(models.AppConfig).filter(
                            models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', 
                            models.AppConfig.value == str(account_id)
                    ).first()
                    if config: client_id = config.client_id
                    
                    # 3. Sincronização de Janela 24h (Cache Interno)
                    if msg_type in ["incoming", 0]:
                        now_utc = datetime.now(timezone.utc)
                        window = db.query(models.ContactWindow).filter(
                            models.ContactWindow.phone == clean_phone,
                            models.ContactWindow.client_id == client_id,
                            models.ContactWindow.chatwoot_inbox_id == inbox_id
                        ).first()
                        
                        if window:
                            window.last_interaction_at = now_utc
                            window.chatwoot_conversation_id = conversation.get("id")
                        else:
                            db.add(models.ContactWindow(
                                client_id=client_id, phone=clean_phone,
                                chatwoot_inbox_id=inbox_id, last_interaction_at=now_utc,
                                chatwoot_conversation_id=conversation.get("id")
                            ))
                        db.commit()
                        logger.info(f"✅ [CACHE] Janela 24h sincronizada para {clean_phone}")

                    # 4. GATILHO DE FUNIL (Apenas para Incoming)
                    if msg_type in ["incoming", 0]:
                        content = payload.get("content", "").strip()
                        search_content = content.lower().strip()
                        clean_search = search_content.replace('!', '').replace('?', '').replace('.', '')
                        
                        # Busca funis candidatos
                        candidates = db.query(models.Funnel).filter(
                            models.Funnel.trigger_phrase.ilike(f"%{search_content}%")
                        ).all()

                        for funnel in candidates:
                            if not funnel.trigger_phrase: continue
                            triggers = [t.strip().lower() for t in funnel.trigger_phrase.split(",")]
                            
                            is_trigger = search_content in triggers
                            if not is_trigger:
                                clean_triggers = [t.replace('!', '').replace('?', '').replace('.', '') for t in triggers]
                                is_trigger = clean_search in clean_triggers
                                
                            if is_trigger:
                                logger.info(f"🎯 Funnel encontrado: {funnel.name} para {clean_phone}")
                                
                                # Atomic Lock
                                import zlib
                                norm_phone = normalize_phone(clean_phone)
                                lock_key = f"lock_{funnel.client_id}_{norm_phone}_{funnel.id}"
                                lock_id = zlib.adler32(lock_key.encode()) & 0x7FFFFFFF
                                db.execute(text("SELECT pg_advisory_xact_lock(:id)"), {"id": lock_id})

                                # Idempotency check 30s
                                time_limit = datetime.now(timezone.utc) - timedelta(seconds=30)
                                existing = db.query(models.ScheduledTrigger).filter(
                                    models.ScheduledTrigger.client_id == funnel.client_id,
                                    models.ScheduledTrigger.funnel_id == funnel.id,
                                    models.ScheduledTrigger.contact_phone.in_([clean_phone, norm_phone]),
                                    models.ScheduledTrigger.created_at >= time_limit
                                ).first()

                                # Parent Discovery: Get the last trigger for this contact to link as child
                                parent_candidate = db.query(models.ScheduledTrigger).filter(
                                    models.ScheduledTrigger.client_id == funnel.client_id,
                                    models.ScheduledTrigger.contact_phone.in_([clean_phone, norm_phone]),
                                    models.ScheduledTrigger.id != (existing.id if existing else None),
                                    models.ScheduledTrigger.parent_id == None # Must be a root trigger
                                ).order_by(models.ScheduledTrigger.created_at.desc()).first()

                                if not existing:
                                    trigger = models.ScheduledTrigger(
                                        client_id=funnel.client_id,
                                        funnel_id=funnel.id,
                                        parent_id=parent_candidate.id if parent_candidate else None,
                                        product_name="HIDDEN_CHILD" if parent_candidate else f"CHAT: {funnel.name}",
                                        conversation_id=conversation.get("id"),
                                        chatwoot_contact_id=sender.get("id"),
                                        chatwoot_account_id=account_id,
                                        chatwoot_inbox_id=inbox_id,
                                        contact_phone=clean_phone,
                                        status='queued',
                                        is_interaction=True,
                                        scheduled_time=datetime.now(timezone.utc)
                                    )
                                    db.add(trigger)
                                    db.commit()
                                    logger.info(f"✅ Trigger {trigger.id} criado (Fone: {clean_phone})")
                                else:
                                    # Trigger já criado pelo Meta webhook (que chega antes do Chatwoot).
                                    # Atualiza com os IDs corretos do Chatwoot que só chegam aqui.
                                    updated = False
                                    cw_conv_id = conversation.get("id")
                                    cw_contact_id = sender.get("id")
                                    if cw_conv_id and existing.conversation_id != cw_conv_id:
                                        existing.conversation_id = cw_conv_id
                                        updated = True
                                    if cw_contact_id and not existing.chatwoot_contact_id:
                                        existing.chatwoot_contact_id = cw_contact_id
                                        existing.chatwoot_account_id = account_id
                                        existing.chatwoot_inbox_id = inbox_id
                                        updated = True
                                    if updated:
                                        db.commit()
                                        logger.info(f"✅ Trigger {existing.id} atualizado com IDs do Chatwoot (conv={cw_conv_id}, contact={cw_contact_id})")
                        
                        return {"status": "processed"}

            except Exception as e:
                logger.error(f"❌ Erro no processamento de webhook message_created: {e}")
                db.rollback()

        return {"status": "ok"}

    # 2. Mensagem Atualizada (Status de Entrega - Sent/Delivered/Read/Failed)
    elif event_type == "message_updated":
        msg_id = payload.get("id")
        status = payload.get("status") # sent, delivered, read, failed
        
        if msg_id and status:
            msg_id_str = str(msg_id)
            
            # Buscar mensagem rastreada com LOCK
            message_record = db.query(models.MessageStatus).filter(
                models.MessageStatus.message_id == msg_id_str
            ).with_for_update().first()
            
            if not message_record:
                logger.warning(f"⚠️ [CHATWOOT WH] Mensagem {msg_id_str} não encontrada no MessageStatus. Ignorando update para {status}.")
                return {"status": "ignored", "reason": "message_not_found"}

            logger.info(f"🔄 [CHATWOOT WH] Mensagem encontrada! ID: {msg_id_str} | Status Atual DB: {message_record.status} | Novo Status: {status}")

            if message_record:
                old_status = message_record.status

                # Se status mudou, atualiza
                if old_status != status:
                    message_record.status = status
                    message_record.updated_at = datetime.now(timezone.utc)

                    # Nota: Contadores e notas privadas são gerenciados pelo Worker via fila whatsapp_events.
                    # O Chatwoot é apenas um espelho — não disparar nota privada aqui para evitar duplicatas.
                    
                    db.commit()
                    logger.info(f"Status atualizado: msg_id={msg_id}, {old_status} -> {status}")
                    return {"status": "updated", "msg_id": msg_id, "new_status": status}
            
            return {"status": "ignored", "reason": "message_not_tracked"}

    return {"status": "ignored"}


@router.post("/webhooks/whatsapp/status")
@limiter.limit("5000/minute")
async def whatsapp_status_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """ Proxy to RabbitMQ to prevent double counting and ensure resilience. """
    try:
        await rabbitmq.publish("whatsapp_events", payload)
        logger.info(f"📤 [META-STATUS] Evento publicado no RabbitMQ")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Falha ao publicar status no RabbitMQ: {e}")
        return {"status": "error"}

@router.post("/webhooks/whatsapp/status/legacy-disabled")
@limiter.limit("5000/minute")
async def whatsapp_status_webhook_legacy(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Recebe atualizações de status diretamente da Meta WhatsApp Cloud API.
    Formato: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#statuses-object
    """
    try:
        # Validação de estrutura do webhook Meta
        entry = payload.get("entry", [])
        if not entry:
            logger.warning("Webhook Meta recebido sem 'entry'")
            return {"status": "ignored", "reason": "no_entry"}
        
        for item in entry:
            changes = item.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                
                for status_obj in statuses:
                    msg_id = status_obj.get("id")
                    status = status_obj.get("status")  # sent, delivered, read, failed
                    recipient = status_obj.get("recipient_id")
                    timestamp = status_obj.get("timestamp")
                    
                    if not msg_id or not status:
                        continue
                    
                    logger.info(f"Meta webhook: msg_id={msg_id}, status={status}, recipient={recipient}")
                    
                    # Limpar ID da mensagem (Meta costuma enviar com prefixo 'wamid.')
                    clean_msg_id = msg_id.replace("wamid.", "") if msg_id else msg_id

                    # Buscar mensagem rastreada com LOCK
                    message_record = db.query(models.MessageStatus).filter(
                        (models.MessageStatus.message_id == msg_id) |
                        (models.MessageStatus.message_id == clean_msg_id)
                    ).with_for_update().first()
                    
                    if message_record:
                        old_status = message_record.status

                        if old_status != status:
                            message_record.status = status
                            message_record.updated_at = datetime.now(timezone.utc)
                            # Notas privadas são gerenciadas pelo Worker via fila whatsapp_events — não disparar aqui.

                            # Atualizar trigger pai
                            trigger = message_record.trigger
                            if trigger:
                                is_delivered_now = status in ['delivered', 'read']
                                was_delivered_before = old_status in ['delivered', 'read']
                                
                                if is_delivered_now and not was_delivered_before:
                                    # --- REACTIVATION LOGIC ---
                                    # 1. Log de Conclusão do Passo 2 (Independente do status do worker)
                                    log_node_execution(
                                        db, trigger, 
                                        node_id='DELIVERY', 
                                        status="completed", 
                                        details="WhatsApp: Entrega confirmada!"
                                    )

                                    # 2. Log de Início do Passo 3 (Estabilização) e Reativação se necessário
                                    resume_at = datetime.now(timezone.utc) + timedelta(seconds=10)
                                    target_time_iso = resume_at.isoformat()
                                    
                                    log_node_execution(
                                        db, trigger, 
                                        node_id='STABILIZATION', 
                                        status="processing", 
                                        details="Estabilizando conexão (10s)...",
                                        extra_data={
                                            "resumed_at": datetime.now(timezone.utc).isoformat(),
                                            "target_time": target_time_iso
                                        }
                                    )

                                    # 3. Se estava pausado, retomar agendamento
                                    if trigger.status == 'paused_waiting_delivery':
                                        logger.info(f"✨ [REACTIVATOR] Retomando trigger {trigger.id} pausado após entrega.")
                                        trigger.status = 'queued'
                                        trigger.scheduled_time = resume_at

                                    if not message_record.delivered_counted:
                                        from services.triggers_service import increment_delivery_stats
                                        
                                        # Determine cost if template
                                        cost_to_apply = 0.0
                                        if trigger.cost_per_unit and message_record.message_type != 'FREE_MESSAGE':
                                            cost_to_apply = trigger.cost_per_unit
                                            
                                        increment_delivery_stats(db, trigger, message_record, cost_to_apply)
                                    else:
                                        logger.info(f"♻️ Delivery already counted for {msg_id}. Skipping increment.")
                                
                                if status == 'failed' and old_status != 'failed':
                                    trigger.total_failed = (trigger.total_failed or 0) + 1
                                    if was_delivered_before:
                                        trigger.total_delivered = max(0, (trigger.total_delivered or 0) - 1)
                                        # Estornar custo se for template
                                        if trigger.cost_per_unit and message_record.message_type != 'FREE_MESSAGE':
                                            trigger.total_cost = max(0.0, (trigger.total_cost or 0.0) - trigger.cost_per_unit)
                            
                            db.commit()
                            logger.info(f"Status Meta atualizado: {msg_id} ({old_status} -> {status})")
                    else:
                        logger.debug(f"Mensagem {msg_id} não rastreada no sistema")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Erro processando webhook Meta: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/webhooks/meta", summary="Meta Verification Challenge")
async def meta_verification(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint para validação do webhook pela Meta.
    Verifica se o hub.verify_token bate com o configurado no banco.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe":
            # 1. Usa exclusivamente o token definido no YAML do Portainer
            # Isso garante que um único token valide todos os domínios do servidor.
            configured_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "zapvoice_oficial")
            
            if token == configured_token:
                logger.info(f"✅ Meta Webhook Challenge Verified! (Using token from ENV)")
                from fastapi import Response
                return Response(content=challenge, media_type="text/plain")
            else:
                logger.warning(f"❌ Meta Verification Failed. Received: {token}, Expected: {configured_token}")
                raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    raise HTTPException(status_code=403, detail="Invalid verification request")

@router.post("/webhooks/meta", summary="Meta Event Ingestion")
async def meta_event_ingestion(
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Recebe eventos da Meta e publica IMEDIATAMENTE no RabbitMQ.
    Latência mínima.
    """
    meta_secret = os.getenv("META_APP_SECRET", "")
    if meta_secret:
        body = await request.body()
        signature = request.headers.get("X-Hub-Signature-256", "")
        if not _check_hmac_signature(body, meta_secret, signature):
            logger.warning("❌ Meta webhook: assinatura HMAC inválida — requisição rejeitada")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    logger.info(f"📥 [META] Webhook Recebido")
    
    # Salva no arquivo
    with open("webhooks_incoming.log", "a", encoding="utf-8") as f:
        f.write(f"📥 [META] {datetime.now(timezone.utc)} | Payload: {json.dumps(payload)}\n")

    # Salva no DB para verificação remota
    try:
        from models import AppConfig
        debug_json = json.dumps({"timestamp": str(datetime.now(timezone.utc)), "payload": payload})
        existing = db.query(AppConfig).filter(AppConfig.key == "DEBUG_META_LAST").first()
        if existing: existing.value = debug_json
        else: db.add(AppConfig(client_id=1, key="DEBUG_META_LAST", value=debug_json))
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao salvar debug meta: {e}")
        # Mas não bloqueia o fluxo principal, tenta enviar para fila mesmo assim
    
    try:
        # Publica no RabbitMQ (Fila Direta)
        await rabbitmq.publish("whatsapp_events", payload)
        logger.info(f"📤 [META] Evento publicado no RabbitMQ: whatsapp_events")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Falha ao publicar no RabbitMQ: {e}")
        # Retorna 200 porque a Meta não tem culpa do nosso Rabbit estar fora, senão ela bloqueia o número
        return {"status": "error_queued_locally"} # TODO: Fallback local future

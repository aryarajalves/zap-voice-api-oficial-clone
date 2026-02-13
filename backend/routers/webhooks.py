from fastapi import APIRouter, Request, Body, BackgroundTasks, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from core.security import limiter
from services.engine import execute_funnel
import models
from datetime import datetime, timezone
import json
import os
from core.logger import setup_logger
from rabbitmq_client import rabbitmq
from chatwoot_client import ChatwootClient
from config_loader import get_setting
from .incoming_webhooks import extract_value_by_path, format_phone, find_phone_in_payload, find_name_in_payload

logger = setup_logger(__name__)

router = APIRouter()

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
    
    # 1. Registrar Evento (Log)
    event = models.WebhookEvent(
        webhook_id=webhook.id,
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
        def get_nested(data, path):
            if not path: return None
            parts = path.split('.')
            curr = data
            for p in parts:
                if isinstance(curr, dict):
                    curr = curr.get(p)
                else:
                    return None
            return curr

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
        
        # 3. Disparar Funil
        trigger = models.ScheduledTrigger(
            client_id=webhook.client_id,
            funnel_id=webhook.funnel_id,
            contact_phone=clean_phone,
            contact_name=str(name) if name else None,
            status='queued',
            scheduled_time=datetime.now(timezone.utc)
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

        return {"status": "success", "trigger_id": trigger.id}

    except Exception as e:
        db.rollback()
        event.status = "failed"
        event.error_message = str(e)
        webhook.total_errors += 1
        db.commit()
        logger.error(f"Error processing webhook {slug}: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/webhooks/{webhook_id}/events")
async def list_webhook_events(webhook_id: int, db: Session = Depends(get_db)):
    events = db.query(models.WebhookEvent).filter(
        models.WebhookEvent.webhook_id == webhook_id
    ).order_by(models.WebhookEvent.created_at.desc()).limit(50).all()
    return events

from .incoming_webhooks import extract_value_by_path, find_phone_in_payload, format_phone

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
        convo_id = await chatwoot.ensure_conversation(clean_phone, name)

        # --- LÓGICA DE ROTEAMENTO CONDICIONAL ---
        final_funnel_id = webhook.funnel_id
        conditional = mapping.get("conditional_routing")
        routing_debug = {"triggered": False}
        
        if conditional and conditional.get("field_path") and conditional.get("rules"):
            check_path = conditional["field_path"]
            check_value_raw, check_path_matched = extract_value_by_path(payload, check_path)
            check_value = str(check_value_raw or "").strip()
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
        db.commit()
        
        return {"status": "retried", "trigger_id": trigger.id}
        
    except Exception as e:
        return {"status": "failed", "error": str(e)}

def recalculate_webhook_stats(webhook_id: int, db: Session):
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
                funnel_id=funnel.id,
                contact_phone=clean_phone,
                status='queued',
                scheduled_time=datetime.now(timezone.utc)
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
                    status='queued',
                    scheduled_time=datetime.now(timezone.utc)
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
async def ping_webhook():
    return {"status": "ok", "version": "1.2.0-robust-match", "timestamp": datetime.now(timezone.utc)}

@router.post("/webhooks/chatwoot")
@limiter.limit("5000/minute")
async def chatwoot_webhook(request: Request, payload: dict = Body(...), db: Session = Depends(get_db)):
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

        # --- SYNC CONTACT LOGIC (Ported) ---
        # Sincroniza tanto para Incoming quanto Outgoing
        if msg_type in ["incoming", "outgoing", 0, 1]:
            try:
                # Extrair dados básicos para Sync
                account_id = payload.get("account", {}).get("id")
                inbox_id = payload.get("inbox", {}).get("id")
                conversation = payload.get("conversation", {})
                
                # Tenta extrair telefone e nome
                phone_number = None
                display_name = None
                
                # Para Incoming: Sender é o contato
                if msg_type in ["incoming", 0]:
                    sender = payload.get("sender", {})
                    phone_number = sender.get("phone_number")
                    display_name = sender.get("name")
                
                # Para ambos (fallback ou Outgoing): Pega do sender da meta ou contact_inbox
                if not phone_number:
                    contact_inbox = conversation.get("contact_inbox", {})
                    source_id = contact_inbox.get("source_id")
                    if source_id and (source_id.isdigit() or source_id.startswith('+')):
                         phone_number = source_id
                    
                    sender_meta = conversation.get("meta", {}).get("sender", {})
                    if not display_name:
                        display_name = sender_meta.get("name")

                if phone_number:
                    clean_phone = "".join(filter(str.isdigit, str(phone_number)))
                    
                    # Identificar Client ID (Simplificado: 1 ou busca por account_id)
                    client_id = 1 
                    if account_id:
                        config = db.query(models.AppConfig).filter(
                             models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', 
                             models.AppConfig.value == str(account_id)
                        ).first()
                        if config: client_id = config.client_id
                    
                    # Define timestamp de interação (apenas se for Incoming)
                    interaction_time = datetime.now() if msg_type in ["incoming", 0] else None
                    
                    sync_table = get_setting("SYNC_CONTACTS_TABLE", "", client_id=client_id)
                    if sync_table:
                        safe_table = "".join(c for c in sync_table if c.isalnum() or c == '_')
                        if safe_table:
                             create_sql = f"""
                                CREATE TABLE IF NOT EXISTS {safe_table} (
                                    phone VARCHAR PRIMARY KEY,
                                    name VARCHAR,
                                    inbox_id INTEGER,
                                    last_interaction_at TIMESTAMP WITH TIME ZONE
                                );
                             """
                             upsert_sql = f"""
                                INSERT INTO {safe_table} (phone, name, inbox_id, last_interaction_at)
                                VALUES (:phone, :name, :inbox_id, :last_interaction_at)
                                ON CONFLICT (phone) DO UPDATE SET
                                    name = COALESCE(EXCLUDED.name, {safe_table}.name),
                                    inbox_id = COALESCE(EXCLUDED.inbox_id, {safe_table}.inbox_id),
                                    last_interaction_at = COALESCE(EXCLUDED.last_interaction_at, {safe_table}.last_interaction_at);
                             """
                             db.execute(text(create_sql))
                             db.execute(text(upsert_sql), {
                                 "phone": clean_phone,
                                 "name": display_name,
                                 "inbox_id": inbox_id,
                                 "last_interaction_at": interaction_time
                             })
                             db.commit()
                             log_action = "WINDOW UPDATED" if interaction_time else "CONTACT SYNCED"
                             logger.info(f"✅ [SYNC] {log_action} - {clean_phone} -> {safe_table}")

            except Exception as e:
                logger.error(f"❌ Error syncing contact {phone_number if 'phone_number' in locals() else 'unknown'}: {e}")
        
        # --- UPDATE INTERNAL CACHE (ContactWindow) ---
        # Ensures that validate-contacts works even without custom SYNC_CONTACTS_TABLE
        if msg_type in ["incoming", 0] and phone_number:
            try:
                clean_phone = "".join(filter(str.isdigit, str(phone_number)))
                
                # Resolve Client ID (reusing logic from above)
                client_id = 1 
                if account_id and 'client_id' not in locals(): # if not resolved above
                    config = db.query(models.AppConfig).filter(
                            models.AppConfig.key == 'CHATWOOT_ACCOUNT_ID', 
                            models.AppConfig.value == str(account_id)
                    ).first()
                    if config: client_id = config.client_id
                
                # Check existance
                window_record = db.query(models.ContactWindow).filter(
                    models.ContactWindow.phone == clean_phone,
                    models.ContactWindow.client_id == client_id
                ).first()
                
                now_utc = datetime.now(timezone.utc)
                
                if window_record:
                    window_record.last_interaction_at = now_utc
                    if display_name: window_record.chatwoot_contact_name = display_name
                    if conversation.get("id"): window_record.chatwoot_conversation_id = conversation.get("id")
                    if inbox_id: window_record.chatwoot_inbox_id = inbox_id
                else:
                    new_window = models.ContactWindow(
                        client_id=client_id,
                        phone=clean_phone,
                        chatwoot_contact_name=display_name,
                        chatwoot_conversation_id=conversation.get("id"),
                        chatwoot_inbox_id=inbox_id,
                        last_interaction_at=now_utc
                    )
                    db.add(new_window)
                
                db.commit()
                logger.info(f"✅ [CACHE] Updated 24h window for {clean_phone}")
            except Exception as e:
                logger.error(f"❌ Error updating ContactWindow cache: {e}")
        # --- END SYNC ---

        if msg_type == "incoming":
             # Lógica de Trigger Phrase
             content = payload.get("content", "").strip()
             sender_phone = payload.get("sender", {}).get("phone_number", "")
             conversation_id = payload.get("conversation", {}).get("id")
             
             if not sender_phone:
                 logger.warning(f"⚠️ Webhook ignored: No sender phone number. Content: {content}")
                 return {"status": "ignored", "reason": "no_phone"}

             # Check Funnels - Procura por frase exata ou dentro de lista separada por vírgula (Case Insensitive + Trim)
             # Melhoria: Busca ampla no banco + Validação estrita no Python para suportar "A, B, C" com espaços
             candidates = db.query(models.Funnel).filter(
                 models.Funnel.trigger_phrase.ilike(f"%{search_content}%")
             ).all()

             matched_funnels = []
             for funnel in candidates:
                 if not funnel.trigger_phrase:
                     continue
                     
                 # Normaliza as frases do funil (split por vírgula e remove espaços)
                 triggers = [t.strip().lower() for t in funnel.trigger_phrase.split(",")]
                 
                 # 1. Tenta Match Exato
                 if search_content in triggers:
                     matched_funnels.append(funnel)
                     continue
                 
                 # 2. Tenta Match Limpo (sem pontuação)
                 # Ex: Usuário mandou "Ola!" e gatilho é "ola"
                 clean_triggers = [t.replace('!', '').replace('?', '').replace('.', '') for t in triggers]
                 if clean_search in clean_triggers:
                     matched_funnels.append(funnel)
                     continue

             if not matched_funnels:
                 logger.warning(f"  No funnel matched for content: '{content}' (Clean: '{clean_search}')")
             
             for funnel in matched_funnels:
                 logger.info(f"🎯 Funnel matched: {funnel.name} for {sender_phone} (Phrase matched in: {funnel.trigger_phrase})")
                 # Cria Trigger
                 trigger = models.ScheduledTrigger(
                     client_id=funnel.client_id,
                     funnel_id=funnel.id,
                     conversation_id=conversation_id,
                     contact_phone=sender_phone,
                     status='queued',
                     scheduled_time=datetime.now(timezone.utc) 
                 )
                 db.add(trigger)
                 db.commit() # O Scheduler vai pegar
                 logger.info(f"✅ Trigger {trigger.id} criado para o funil {funnel.id}")
             
             return {"status": "processed", "matches": len(matched_funnels)}

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

                async def check_and_post_private_note(record, current_status):
                    if current_status in ['delivered', 'read'] and record.pending_private_note and not record.private_note_posted:
                        logger.info(f"📣 Message delivered ({current_status})! Enqueueing pending private note for {record.phone_number}")
                        t = record.trigger
                        success = await rabbitmq.publish("chatwoot_private_messages", {
                            "client_id": t.client_id,
                            "phone": record.phone_number,
                            "message": record.pending_private_note,
                            "trigger_id": t.id,
                            "delay": t.private_message_delay or 5,
                            "concurrency": t.private_message_concurrency or 1
                        })
                        if success:
                            record.private_note_posted = True
                            db.commit()
                            logger.info(f"✅ Private note enqueued for {record.phone_number}")

                # Se status mudou, atualiza
                if old_status != status:
                    message_record.status = status
                    message_record.updated_at = datetime.now(timezone.utc)
                    
                    # Check private note delivery
                    await check_and_post_private_note(message_record, status)

                    # Nota: Contadores de trigger_delivered/read foram removidos daqui
                    # para evitar contagem duplicada com o webhook direto da Meta,
                    # que é processado pelo Worker. O Chatwoot é apenas um espelho.
                    
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
                    
                    # Buscar mensagem rastreada com LOCK
                    message_record = db.query(models.MessageStatus).filter(
                        models.MessageStatus.message_id == msg_id
                    ).with_for_update().first()
                    
                    if message_record:
                        old_status = message_record.status

                        async def check_and_post_private_note(record, current_status):
                            if current_status in ['delivered', 'read'] and record.pending_private_note and not record.private_note_posted:
                                logger.info(f"📣 (Meta) Message delivered ({current_status})! Enqueueing pending private note for {record.phone_number}")
                                t = record.trigger
                                success = await rabbitmq.publish("chatwoot_private_messages", {
                                    "client_id": t.client_id,
                                    "phone": record.phone_number,
                                    "message": record.pending_private_note,
                                    "trigger_id": t.id,
                                    "delay": t.private_message_delay or 5,
                                    "concurrency": t.private_message_concurrency or 1
                                })
                                if success:
                                    record.private_note_posted = True
                                    db.commit()
                                    logger.info(f"✅ Private note enqueued for {record.phone_number}")
                        
                        if old_status != status:
                            message_record.status = status
                            message_record.updated_at = datetime.now(timezone.utc)
                            
                            # Check private note delivery
                            await check_and_post_private_note(message_record, status)

                            # Atualizar trigger pai
                            trigger = message_record.trigger
                            if trigger:
                                is_delivered_now = status in ['delivered', 'read']
                                was_delivered_before = old_status in ['delivered', 'read']
                                
                                if is_delivered_now and not was_delivered_before:
                                    trigger.total_delivered = (trigger.total_delivered or 0) + 1
                                    # Custo incremental só para TEMPLATES
                                    if trigger.cost_per_unit and message_record.message_type != 'DIRECT_MESSAGE':
                                        trigger.total_cost = (trigger.total_cost or 0.0) + trigger.cost_per_unit
                                
                                if status == 'failed' and old_status != 'failed':
                                    trigger.total_failed = (trigger.total_failed or 0) + 1
                                    if was_delivered_before:
                                        trigger.total_delivered = max(0, (trigger.total_delivered or 0) - 1)
                                        # Estornar custo se for template
                                        if trigger.cost_per_unit and message_record.message_type != 'DIRECT_MESSAGE':
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
    db: Session = Depends(get_db) # Adicionado DB para log
):
    """
    Recebe eventos da Meta e publica IMEDIATAMENTE no RabbitMQ.
    Latência mínima.
    """
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

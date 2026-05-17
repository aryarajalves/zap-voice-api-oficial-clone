import uuid
import json
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy import text
from sqlalchemy.orm import Session
import models, schemas
from database import SessionLocal
from core.logger import logger
from rabbitmq_client import rabbitmq
from services.leads import upsert_webhook_lead
from services.manychat import sync_to_manychat, sync_to_manychat_and_update_history
from core.deps import get_db
from services.webhooks import (
    get_brasilia_now, 
    compute_dynamic_manychat_tag, 
    parse_webhook_payload,
    extract_nested_custom_fields,
    replace_variables_in_string,
    process_webhook_automation
)

router = APIRouter()

# Centralized logic in services/webhooks.py

# Trava Global de Memória para evitar Race Conditions de milissegundos nos webhooks
GLOBAL_WEBHOOK_LOCKS = {}

@router.post("/webhooks/{integration_uuid}")
@router.get("/webhooks/{integration_uuid}")
async def handle_external_webhook(
    integration_uuid: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Recebe um webhook externo (Hotmart, Kiwify, Eduzz, Elementor, etc)
    E dispara o fluxo mapeado.
    """
    if request.method == "GET":
        return {
            "status": "online",
            "message": "Este é um endpoint de webhook. Por favor, envie uma requisição POST com o payload JSON da sua plataforma.",
            "integration_id": integration_uuid
        }
    
    # 0. Front Shield (Atomic Lock)
    # Evita que a mesma plataforma envie o mesmo payload 2x em menos de 5s
    body = await request.body()
    import hashlib
    payload_hash = hashlib.sha256(body).hexdigest()
    lock_key = f"webhook_{integration_uuid}_{payload_hash}"
    now = datetime.now(timezone.utc)
    
    if lock_key in GLOBAL_WEBHOOK_LOCKS:
        last_time = GLOBAL_WEBHOOK_LOCKS[lock_key]
        if now - last_time < timedelta(seconds=5):
            logger.warning(f"🚫 [WEBHOOK_LOCK] Payload duplicado detectado para {integration_uuid}. Ignorando.")
            return {"status": "ignored", "reason": "duplicate_payload_lock"}
    
    GLOBAL_WEBHOOK_LOCKS[lock_key] = now
    
    # 1. Identify Integration
    integration = None
    try:
        # Tenta buscar pelo UUID original (primary key)
        integration_id_obj = uuid.UUID(integration_uuid)
        integration = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.id == str(integration_id_obj),
            models.WebhookIntegration.status == "active"
        ).first()
    except ValueError:
        # Não é um UUID — tenta buscar pelo slug personalizado
        integration = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.custom_slug == integration_uuid,
            models.WebhookIntegration.status == "active"
        ).first()
        if not integration:
            logger.warning(f"Webhook Integration slug '{integration_uuid}' rejected (Not found or inactive)")
            return {"status": "ignored", "reason": "integration_not_found_or_inactive"}

    if not integration:
        logger.warning(f"Webhook Integration {integration_uuid} rejected (Not found or inactive)")
        return {"status": "ignored", "reason": "integration_not_found_or_inactive"}

    # 2. Extract and Normalize Data
    payload = {}
    try:
        if body:
            payload = json.loads(body)
        
        # Detect event type from payload
        extracted_data = parse_webhook_payload(integration.platform, payload)
        event_type = extracted_data.get("event_type", "outros")
        
        logger.info(f"📥 [WEBHOOK] {integration.name} ({integration.platform}) | Evento: {event_type}")

        # 3. Create History Record EARLIER (to ensure logging)
        history = models.WebhookHistory(
            integration_id=integration.id,
            payload=payload,
            event_type=event_type,
            status="pending"
        )
        db.add(history)
        db.commit()
        db.refresh(history)

        # 4. Find Matching Mapping
        mapping = None
        # First priority: Specific event type mapping
        mapping = db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == integration.id,
            models.WebhookEventMapping.event_type == event_type,
            models.WebhookEventMapping.is_active == True
        ).first()
        
        # Second priority: 'outros' (catch-all) mapping if no specific match
        if not mapping and event_type != "outros":
            mapping = db.query(models.WebhookEventMapping).filter(
                models.WebhookEventMapping.integration_id == integration.id,
                models.WebhookEventMapping.event_type == "outros",
                models.WebhookEventMapping.is_active == True
            ).first()
            
        if not mapping:
            logger.info(f"⏭️ [SKIP] Nenhum mapeamento configurado para {event_type} na integração {integration.name}")
            history.status = "skipped"
            history.error_message = f"No mapping found for event: {event_type}"
            db.commit()
            return {"status": "skipped", "reason": "no_mapping_found"}

        # 5. Extract Variables
        # Começamos com os dados extraídos pelo parser (contém product_name, price, etc)
        final_vars = extracted_data.copy()
        
        # Sobrescrevemos com a resolução robusta (suporta mustache {{name}})
        final_vars["name"] = replace_variables_in_string("{{name}}", payload, extracted_data)
        final_vars["phone"] = replace_variables_in_string("{{phone}}", payload, extracted_data)
        final_vars["email"] = replace_variables_in_string("{{email}}", payload, extracted_data)


        # Custom fields mapping (se houver na integração)
        custom_vars = {}
        if integration.custom_fields_mapping:
            custom_vars = extract_nested_custom_fields(payload, integration.custom_fields_mapping)
        
        final_vars.update(custom_vars)
        
        # Update History with processed data
        history.mapping_id = mapping.id
        history.processed_data = {
            "extracted_vars": final_vars,
            "event_detected": event_type,
            "platform": integration.platform,
            "name": final_vars.get("name"),
            "phone": final_vars.get("phone"),
            "email": final_vars.get("email"),
            "product_name": extracted_data.get("product_name"),
            "payment_method": extracted_data.get("payment_method"),
            "price": extracted_data.get("price"),
            "raw_status": extracted_data.get("raw_status"),

            "custom_fields": custom_vars,
            "manychat_enabled": getattr(mapping, "manychat_active", False),
            "private_note_enabled": bool(getattr(mapping, "private_note", None)),
            "chatwoot_label": getattr(mapping, "chatwoot_label", []),
            "free_message_enabled": getattr(mapping, "send_as_free_message", False)
        }
        history.event_type = event_type
        db.commit()
        
        # Logging das variáveis extraídas para debug
        logger.info(f"🔍 [VARS] Extracted: {final_vars}")

        # 6. Process Automations (Background)
        # Sincroniza Lead com o banco central de leads
        background_tasks.add_task(
            upsert_webhook_lead,
            SessionLocal(), 
            client_id=integration.client_id,
            platform=integration.platform,
            parsed_data=final_vars
        )


        # ManyChat Sync (Background)
        if getattr(mapping, "manychat_active", False):
            # Sincronização ManyChat
            mc_name = replace_variables_in_string(getattr(mapping, "manychat_name", None) or "{{name}}", payload, extracted_data)
            mc_phone = replace_variables_in_string(getattr(mapping, "manychat_phone", None) or "{{phone}}", payload, extracted_data)
            
            # Use dynamic tag if automation is active
            if getattr(mapping, "manychat_tag_automation", False):
                mc_tag = compute_dynamic_manychat_tag(mapping)
            else:
                mc_tag = getattr(mapping, "manychat_tag", None)

            if mc_tag:
                background_tasks.add_task(
                    sync_to_manychat_and_update_history,
                    client_id=integration.client_id,
                    name=mc_name,
                    phone=mc_phone,
                    tag=mc_tag,
                    email=final_vars.get("email"),
                    history_id=history.id
                )

        # Main Automation Process
        background_tasks.add_task(
            process_webhook_automation,
            client_id=integration.client_id,
            mapping=mapping,
            variables=final_vars,
            history_id=history.id
        )

        return {
            "status": "success", 
            "history_id": history.id,
            "event": event_type
        }

    except Exception as e:
        logger.error(f"❌ [ERROR] Falha crítica processando webhook: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Tenta salvar no histórico se já não foi criado ou atualizar se foi
        try:
            # Verifica se history já existe (se falhou depois do commit inicial)
            # Se não existe, cria um novo
            if 'history' not in locals():
                error_history = models.WebhookHistory(
                    integration_id=integration.id,
                    payload=payload if payload else {},
                    status="failed",
                    error_message=str(e)
                )
                db.add(error_history)
            else:
                history.status = "failed"
                history.error_message = str(e)
            
            db.commit()
        except Exception as db_err:
            logger.error(f"Erro ao salvar histórico de erro: {db_err}")

        return {"status": "error", "message": str(e)}

@router.get("/webhooks/public/test")
async def test_public_webhook():
    return {"status": "ok", "message": "Public webhook endpoint is working"}

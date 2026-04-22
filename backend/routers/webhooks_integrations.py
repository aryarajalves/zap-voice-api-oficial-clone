from fastapi import APIRouter, Depends, HTTPException, Request, Query, Header, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
import uuid
import json
from rabbitmq_client import rabbitmq
from core.logger import logger
from services.leads import upsert_webhook_lead
from services.webhooks import parse_webhook_payload
import re

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/webhooks", response_model=List[schemas.WebhookIntegration], summary="Listar todas integrações de webhooks")
@router.get("/webhooks/", response_model=List[schemas.WebhookIntegration], include_in_schema=False)
@router.get("/webhook-integrations", response_model=List[schemas.WebhookIntegration], summary="Listar integrações de webhooks")
def list_webhook_integrations(
    skip: int = 0,
    limit: int = 100,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna uma lista de todas as integrações de webhooks cadastradas.
    """
    integrations = db.query(models.WebhookIntegration).options(
        joinedload(models.WebhookIntegration.mappings)
    ).filter(
        models.WebhookIntegration.client_id == x_client_id
    ).order_by(models.WebhookIntegration.created_at.asc()).offset(skip).limit(limit).all()
    
    logger.info(f"🔍 [WEBHOOKS] Listando integrações para client_id {x_client_id}: {len(integrations)} encontradas.")
    
    return integrations


@router.get("/webhooks/{integration_id}", response_model=schemas.WebhookIntegration, summary="Obter detalhes de uma integração")
@router.get("/webhook-integrations/{integration_id}", include_in_schema=False)
def read_webhook_integration(
    integration_id: str,
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
    return integration

@router.post("/webhooks", response_model=schemas.WebhookIntegration, summary="Criar nova integração de webhook")
@router.post("/webhook-integrations", include_in_schema=False)
def create_webhook_integration(
    integration: schemas.WebhookIntegrationCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        db_integration = models.WebhookIntegration(
            name=integration.name,
            platform=integration.platform,
            status=integration.status,
            custom_fields_mapping=integration.custom_fields_mapping,
            custom_slug=integration.custom_slug,
            product_filtering=getattr(integration, 'product_filtering', False),
            product_whitelist=getattr(integration, 'product_whitelist', []),
            discovered_products=getattr(integration, 'discovered_products', []),
            client_id=x_client_id
        )
        db.add(db_integration)
        # Flush para obter o ID sem fechar a transação prematuramente
        db.flush()
        
        if integration.mappings:
            for mapping in integration.mappings:
                # Conversão robusta de template_id: deve ser INT ou NULL para BigInt column
                safe_template_id = None
                if mapping.template_id:
                    tid_raw = str(mapping.template_id).strip().lower()
                    if tid_raw.isdigit():
                        safe_template_id = int(tid_raw)
                    # Se for "null" ou vazio, safe_template_id permanece None

                db_mapping = models.WebhookEventMapping(
                    integration_id=db_integration.id,
                    event_type=mapping.event_type,
                    template_id=safe_template_id,
                    template_name=mapping.template_name,
                    template_language=getattr(mapping, 'template_language', 'pt_BR'),
                    template_components=getattr(mapping, 'template_components', None),
                    funnel_id=getattr(mapping, 'funnel_id', None),
                    delay_minutes=mapping.delay_minutes,
                    delay_seconds=mapping.delay_seconds,
                    variables_mapping=mapping.variables_mapping,
                    private_note=mapping.private_note,
                    cancel_events=mapping.cancel_events,
                    chatwoot_label=json.dumps(mapping.chatwoot_label) if isinstance(mapping.chatwoot_label, list) else mapping.chatwoot_label,
                    internal_tags=mapping.internal_tags,
                    publish_external_event=mapping.publish_external_event,
                    send_as_free_message=True,
                    trigger_once=getattr(mapping, 'trigger_once', False),
                    manychat_active=getattr(mapping, 'manychat_active', False),
                    manychat_name=getattr(mapping, 'manychat_name', None),
                    manychat_phone=getattr(mapping, 'manychat_phone', None),
                    manychat_tag=getattr(mapping, 'manychat_tag', None),
                    manychat_tag_automation=getattr(mapping, 'manychat_tag_automation', False),
                    manychat_tag_prefix=getattr(mapping, 'manychat_tag_prefix', None),
                    manychat_tag_rotation_time=getattr(mapping, 'manychat_tag_rotation_time', "08:00"),
                    manychat_tag_rotation_day=getattr(mapping, 'manychat_tag_rotation_day', 0),
                    product_name=getattr(mapping, 'product_name', None),
                    is_active=mapping.is_active
                )
                db.add(db_mapping)
            
        db.commit()
        # Recarrega com joinedload para garantir que os mappings vêm na resposta
        new_integration = db.query(models.WebhookIntegration).options(
            joinedload(models.WebhookIntegration.mappings)
        ).filter(models.WebhookIntegration.id == db_integration.id).first()
        
        return new_integration
    except Exception as e:
        db.rollback()
        import traceback
        print(f"ERROR creating integration: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro interno ao salvar: {str(e)}")

@router.put("/webhooks/{integration_id}", response_model=schemas.WebhookIntegration, summary="Atualizar integração existente")
@router.put("/webhook-integrations/{integration_id}", include_in_schema=False)
def update_webhook_integration(
    integration_id: str,
    integration_update: schemas.WebhookIntegrationCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    db_integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    try:
        print(f"\n🔄 [WEBHOOKS] Atualizando integração {integration_id} (Client {x_client_id})")
        print(f"📦 [DATA] {integration_update.json()}")
        
        db_integration.name = integration_update.name
        db_integration.platform = integration_update.platform
        db_integration.status = integration_update.status
        db_integration.custom_fields_mapping = integration_update.custom_fields_mapping
        
        # Robust handling for custom_slug: trim and treat empty as None
        raw_slug = getattr(integration_update, 'custom_slug', None)
        if isinstance(raw_slug, str):
            clean_slug = raw_slug.strip().lower()
            db_integration.custom_slug = clean_slug if clean_slug else None
        else:
            db_integration.custom_slug = None

        db_integration.product_filtering = getattr(integration_update, 'product_filtering', False)
        db_integration.product_whitelist = getattr(integration_update, 'product_whitelist', [])
        db_integration.discovered_products = getattr(integration_update, 'discovered_products', [])
        
        # Update mappings (replace all using collection management for better synchronization)
        # 1. First find all current mappings and remove them
        # 1. Limpar mapeamentos antigos para evitar duplicidade ou lixo
        db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == uuid_obj
        ).delete(synchronize_session='fetch')
        db.flush() # Força a deleção no banco antes de prosseguir
        
        # 2. Add new mappings
        if integration_update.mappings:
            for i, mapping in enumerate(integration_update.mappings):
                # Conversão robusta de template_id: deve ser INT ou NULL para BigInt column
                safe_template_id = None
                if mapping.template_id:
                    tid_raw = str(mapping.template_id).strip().lower()
                    if tid_raw and tid_raw not in ["null", "undefined", "none"]:
                        try:
                            safe_template_id = int(tid_raw)
                        except:
                            safe_template_id = None
                
                # O is_active deve ser pego explicitamente. Se for None, assume True.
                # Mas aqui garantimos que o valor do mapping (vido do JSON) seja respeitado.
                active_status = mapping.is_active if mapping.is_active is not None else True
                print(f"📍 [DEBUG-SAVE] {mapping.event_type} -> is_active: {active_status}")
                
                db_mapping = models.WebhookEventMapping(
                    integration_id=uuid_obj,
                    event_type=mapping.event_type,
                    template_id=safe_template_id,
                    template_name=mapping.template_name,
                    template_language=getattr(mapping, 'template_language', 'pt_BR'),
                    template_components=getattr(mapping, 'template_components', []),
                    funnel_id=getattr(mapping, 'funnel_id', None),
                    delay_minutes=mapping.delay_minutes,
                    delay_seconds=mapping.delay_seconds,
                    variables_mapping=mapping.variables_mapping,
                    private_note=mapping.private_note,
                    cancel_events=mapping.cancel_events,
                    chatwoot_label=json.dumps(mapping.chatwoot_label) if isinstance(mapping.chatwoot_label, list) else mapping.chatwoot_label,
                    internal_tags=mapping.internal_tags,
                    publish_external_event=mapping.publish_external_event,
                    send_as_free_message=True,
                    trigger_once=getattr(mapping, 'trigger_once', False),
                    manychat_active=getattr(mapping, 'manychat_active', False),
                    manychat_name=getattr(mapping, 'manychat_name', None),
                    manychat_phone=getattr(mapping, 'manychat_phone', None),
                    manychat_tag=getattr(mapping, 'manychat_tag', None),
                    manychat_tag_automation=getattr(mapping, 'manychat_tag_automation', False),
                    manychat_tag_prefix=getattr(mapping, 'manychat_tag_prefix', None),
                    manychat_tag_rotation_time=getattr(mapping, 'manychat_tag_rotation_time', "08:00"),
                    manychat_tag_rotation_day=getattr(mapping, 'manychat_tag_rotation_day', 0),
                    product_name=getattr(mapping, 'product_name', None),
                    is_active=active_status
                )
                db.add(db_mapping)

        db.commit()
        # Limpa o cache da sessão para garantir que o query seguinte pegue do banco
        db.expire_all()
        
        # Recarrega com joinedload para garantir que os mappings vêm na resposta
        updated_integration = db.query(models.WebhookIntegration).options(
            joinedload(models.WebhookIntegration.mappings)
        ).filter(models.WebhookIntegration.id == uuid_obj).first()
        
        return updated_integration
    except Exception as e:
        db.rollback()
        import traceback
        print(f"ERROR updating integration: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro interno ao atualizar: {str(e)}")

@router.delete("/webhooks/{integration_id}", summary="Excluir integração")
@router.delete("/webhook-integrations/{integration_id}", include_in_schema=False)
def delete_webhook_integration(
    integration_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    db_integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    db.delete(db_integration)
    db.commit()
    return {"message": "Integration deleted successfully"}

@router.get("/webhooks/{integration_id}/history", response_model=List[schemas.WebhookHistory], summary="Listar histórico de recebimento")
@router.get("/webhook-integrations/{integration_id}/history", include_in_schema=False)
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

    # Verify integration belongs to client
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    from sqlalchemy import or_, cast, String
    
    query = db.query(models.WebhookHistory).filter(
        cast(models.WebhookHistory.integration_id, String) == str(uuid_obj)
    )
    
    if search and search.strip():
        search = search.strip()
        
        # Se for apenas números, tentar busca normalizada
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

@router.put("/webhooks/history/{history_id}", summary="Editar Payload do JSON do Histórico")
@router.put("/webhook-integrations/history/{history_id}", include_in_schema=False)
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

    # Usar a função centralizada de parse para processar o novo payload
    parsed_data = parse_webhook_payload(integration.platform, new_payload)

    history.payload = new_payload
    history.processed_data = parsed_data
    db.commit()
    db.refresh(history)

    # Retorna o objeto completo para sincronização do frontend
    return {
        "status": "success", 
        "id": history.id,
        "processed_data": parsed_data, 
        "payload": new_payload,
        "event_type": history.event_type
    }

@router.post("/webhooks/history/{history_id}/resend", summary="Reenviar um webhook do histórico")
@router.post("/webhook-integrations/history/{history_id}/resend", include_in_schema=False)
async def resend_webhook(
    history_id: int,
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == history_id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="History entry not found")
        
    # Verify ownership
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == history.integration_id,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Re-call the public webhook logic (simulated)
    from .webhooks_public import parse_webhook_payload
    payload = history.payload
    parsed_data = parse_webhook_payload(integration.platform, payload)
    
    event_type = parsed_data.get("event_type", "").lower()
    phone = parsed_data.get("phone")
    name = parsed_data.get("name")

    if not phone:
        return {"status": "failed", "message": "Nenhum telefone encontrado no payload deste webhook. Não foi possível processar o reenvio."}

    # Find matching event mappings
    mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == integration.id,
        models.WebhookEventMapping.event_type == event_type
    ).all()
    
    logger.info(f"🔍 [RESEND] Encontrados {len(mappings)} mapeamentos para o evento '{event_type}'")

    if not mappings:
        return {
            "status": "ignored", 
            "message": f"O evento '{event_type}' foi ignorado porque não existe nenhum mapeamento configurado para ele nesta integração. Clique em 'Editar' na integração para configurar um template ou ação."
        }

    # --- SUPPRESSION CHECK (Avoid re-sending if a superior event exists) ---
    all_integration_mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == integration.id,
        models.WebhookEventMapping.is_active == True
    ).all()

    suppressor_event_types = []
    for m in all_integration_mappings:
        if m.cancel_events and event_type in m.cancel_events:
            suppressor_event_types.append(m.event_type)

    if suppressor_event_types:
        time_limit = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=3)
        superior_trigger = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.integration_id == integration.id,
            models.ScheduledTrigger.contact_phone == phone,
            models.ScheduledTrigger.product_name == parsed_data.get("product_name"),
            models.ScheduledTrigger.event_type.in_(suppressor_event_types),
            models.ScheduledTrigger.status.in_(["completed", "processing", "queued", "pending"]),
            models.ScheduledTrigger.created_at >= time_limit,
            models.ScheduledTrigger.id != history_id, # If re-sending the same, don't suppress itself
            models.ScheduledTrigger.is_bulk == False
        ).first()

        if superior_trigger:
            logger.info(f"⚠️ [RESEND] Suppression detected by '{superior_trigger.event_type}', but PROCEEDING because this is a MANUAL re-send.")
            # return {
            #     "status": "suppressed", 
            #     "reason": f"suppressed_by_{superior_trigger.event_type}",
            #     "message": f"Envio cancelado: O cliente já possui um evento superior '{superior_trigger.event_type}' concluído recentemente."
            # }

    # Execute Templates
    count = 0
    for mapping in mappings:
        template_name = mapping.template_name
        funnel_id = getattr(mapping, 'funnel_id', None)

        # Fallback: se o nome estiver nulo, busca no cache pelo ID
        if not template_name and mapping.template_id:
            tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.id == mapping.template_id
            ).first()
            if tpl_cache:
                template_name = tpl_cache.name

        if not template_name and not funnel_id:
             # Se for apenas label ou nota, permitimos continuar para criar o trigger
             pass
            
        from .webhooks_public import extract_mapped_variables
        components = extract_mapped_variables(payload, parsed_data, mapping.variables_mapping or {})
        
        private_msg_text = None
        mapping_note = getattr(mapping, "private_note", None)
        
        if mapping_note:
            if mapping_note.lower() == "true":
                # Comportamento automático: extrai do corpo do template
                if template_name:
                    template = db.query(models.WhatsAppTemplateCache).filter(
                        models.WhatsAppTemplateCache.name == template_name,
                        models.WhatsAppTemplateCache.client_id == integration.client_id
                    ).first()
                    if template:
                        private_msg_text = template.body
                        
                        # Extrair parâmetros dos componentes para substituir variáveis {{1}}, {{2}}...
                        body_params = []
                        for comp in components:
                            if comp.get("type") == "body":
                                body_params = comp.get("parameters", [])
                                break
                        
                        for idx, p in enumerate(body_params):
                            text_val = p.get("text", "-")
                            private_msg_text = private_msg_text.replace(f"{{{{{idx+1}}}}}", str(text_val))
                        
                        private_msg_text = f"🔐 NOTA PRIVADA AUTOMÁTICA:\n{private_msg_text}"
            else:
                # Comportamento customizado: usa o texto do campo diretamente
                # Note: worker.py handles variable replacement like {{nome}} later
                private_msg_text = mapping_note
        
        # Calculate delay
        delay_min = mapping.delay_minutes or 0
        delay_sec = mapping.delay_seconds or 0
        total_delay_sec = (delay_min * 60) + delay_sec

        scheduled_time = datetime.now(timezone.utc)
        if total_delay_sec > 0:
            scheduled_time = scheduled_time + timedelta(seconds=total_delay_sec)
            status = "queued"
        else:
            status = "processing"

        # 1. --- ManyChat Sync ---
        if getattr(mapping, "manychat_active", False):
            from .webhooks_public import replace_variables_in_string
            from services.manychat import sync_to_manychat
            from services.webhooks import compute_dynamic_manychat_tag
            
            mc_name = replace_variables_in_string(mapping.manychat_name or "", payload, parsed_data)
            mc_phone = replace_variables_in_string(mapping.manychat_phone or "", payload, parsed_data)
            
            # Use dynamic tag if automation is active
            if getattr(mapping, "manychat_tag_automation", False):
                mc_tag = compute_dynamic_manychat_tag(mapping)
            else:
                mc_tag = mapping.manychat_tag
            
            logger.info(f"➕ [RESEND MANYCHAT] Agendando sincronização para {mc_phone} ({mc_name}) com tag '{mc_tag}'")
            background_tasks.add_task(sync_to_manychat, integration.client_id, mc_name, mc_phone, mc_tag)

        # 2. --- Skip Trigger if no content ---
        if not template_name and not funnel_id and not private_msg_text:
            logger.info(f"⏭️ [RESEND_SKIP] No content for mapping {mapping.id}. Only ManyChat sync performed.")
            # We don't increment count because no trigger created, but it's a success
            continue

        st = models.ScheduledTrigger(
            scheduled_time=scheduled_time,
            status=status,
            contact_name=name,
            contact_phone=phone,
            template_name=template_name,
            template_components=components,
            template_language="pt_BR",
            client_id=integration.client_id,
            product_name=parsed_data.get("product_name"),
            private_message=private_msg_text,
            publish_external_event=mapping.publish_external_event,
            chatwoot_label=mapping.chatwoot_label,
            is_free_message=getattr(mapping, "send_as_free_message", False),
            event_type=event_type,
            integration_id=integration.id,
            funnel_id=funnel_id,
            is_bulk=False
        )
        db.add(st)
        db.commit()
        db.refresh(st)
        
        # If no delay, trigger immediately via RabbitMQ
        if total_delay_sec <= 0:
            await rabbitmq.publish("zapvoice_funnel_executions", {
                "trigger_id": st.id,
                "funnel_id": funnel_id,
                "conversation_id": None,
                "contact_phone": phone,
                "contact_name": name
            })
            count += 1

    response_data = {
        "status": "success", 
        "message": f"Reenvio concluído: {count} disparo(s) gerado(s) e agendado(s) com sucesso!",
        "count": count
    }
    logger.info(f"✅ [RESEND] Response: {response_data}")
    return response_data

@router.delete("/webhooks/history/{history_id}", summary="Excluir um registro de histórico")
@router.delete("/webhook-integrations/history/{history_id}", include_in_schema=False)
async def delete_webhook_history(
    history_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify ownership via integration
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

@router.post("/webhooks/history/bulk-delete", summary="Excluir múltiplos registros")
@router.post("/webhook-integrations/history/bulk-delete", include_in_schema=False)
async def bulk_delete_webhook_history(
    history_ids: List[int],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify ownership and delete
    db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id.in_(history_ids),
        models.WebhookHistory.integration_id.in_(
            db.query(models.WebhookIntegration.id).filter(models.WebhookIntegration.client_id == x_client_id)
        )
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"status": "success"}

@router.delete("/webhooks/{integration_id}/history/clear", summary="Limpar todo o histórico de uma integração")
@router.delete("/webhook-integrations/{integration_id}/history/clear", include_in_schema=False)
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

    # Verify integration belongs to client
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

@router.get("/webhooks/{integration_id}/history/export", summary="Exportar todo o histórico como JSON")
@router.get("/webhook-integrations/{integration_id}/history/export", include_in_schema=False)
def export_webhook_history(
    integration_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from fastapi.responses import JSONResponse
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

    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == uuid_obj
    ).order_by(models.WebhookHistory.created_at.asc()).all()

    export_data = [
        {
            "event_type": h.event_type,
            "payload": h.payload,
            "processed_data": h.processed_data,
            "status": h.status,
            "error_message": h.error_message,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in history
    ]

    return JSONResponse(
        content={"integration_name": integration.name, "platform": integration.platform, "records": export_data},
        headers={"Content-Disposition": f"attachment; filename=historico_{integration.custom_slug or str(uuid_obj)[:8]}.json"}
    )

@router.post("/webhooks/{integration_id}/history/import", summary="Importar histórico de webhooks via JSON")
@router.post("/webhook-integrations/{integration_id}/history/import", include_in_schema=False)
async def import_webhook_history(
    integration_id: str,
    request: Request,
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

    body = await request.json()
    records = body if isinstance(body, list) else body.get("records", [])

    if not records:
        raise HTTPException(status_code=400, detail="Nenhum registro encontrado no arquivo")

    imported = 0
    for rec in records:
        h = models.WebhookHistory(
            integration_id=uuid_obj,
            event_type=rec.get("event_type"),
            payload=rec.get("payload"),
            processed_data=rec.get("processed_data"),
            status=rec.get("status", "received"),
            error_message=rec.get("error_message"),
        )
        if rec.get("created_at"):
            try:
                h.created_at = datetime.fromisoformat(rec["created_at"])
            except Exception:
                pass
        db.add(h)
        imported += 1

    db.commit()
    return {"status": "success", "imported": imported}

@router.post("/webhooks/history/{history_id}/sync", summary="Sincronizar/Re-processar extração de dados")
@router.post("/webhook-integrations/history/{history_id}/sync", include_in_schema=False)
async def sync_webhook_history(
    history_id: int,
    background_tasks: BackgroundTasks,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == history_id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
        
    # Verify ownership
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == history.integration_id,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Re-call the public webhook logic
    from .webhooks_public import parse_webhook_payload
    payload = history.payload
    
    # Re-parse with the LATEST logic (includes translations like APPROVED -> Compra Aprovada)
    parsed_data = parse_webhook_payload(integration.platform, payload)
    
    history.processed_data = parsed_data
    history.event_type = parsed_data.get("event_type", "").lower()
    
    # Update status from 'ignored' if a mapping now exists
    from .webhooks_integrations import models as local_models
    mapping_exists = db.query(local_models.WebhookEventMapping).filter(
        local_models.WebhookEventMapping.integration_id == integration.id,
        local_models.WebhookEventMapping.event_type == history.event_type
    ).first()
    
    if mapping_exists and history.status == "ignored":
        history.status = "processed"
    elif not mapping_exists and history.status == "processed":
        history.status = "ignored"

    try:
        tag_list = []
        if mapping_exists:
            if mapping_exists.chatwoot_label:
                # ROBUST EXTRACTION: Use shared utility to handle lists, JSON strings or comma-separated strings
                from core.utils import robust_extract_labels
                current_raw = robust_extract_labels(mapping_exists.chatwoot_label)
                
                if current_raw:
                    tag_list.extend([str(t).strip() for t in current_raw if t])
            if getattr(mapping_exists, "internal_tags", None):
                tag_list.extend([t.strip() for t in mapping_exists.internal_tags.split(',') if t.strip()])
        
        tag = ", ".join(list(dict.fromkeys(tag_list))) if tag_list else None
        
        upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, event_time=history.created_at, force_time=True, tag=tag)
        logger.info(f"👤 [SYNC] Lead {parsed_data.get('phone')} atualizado via Sync manual (Tags: {tag}).")

        # --- ManyChat Sync (if mapping exists and name/phone are available) ---
        if mapping_exists and getattr(mapping_exists, "manychat_active", False) and parsed_data.get("phone"):
            from .webhooks_public import replace_variables_in_string
            from services.manychat import sync_to_manychat
            from services.webhooks import compute_dynamic_manychat_tag
            
            mc_name = replace_variables_in_string(mapping_exists.manychat_name or "", history.payload, parsed_data)
            mc_phone = replace_variables_in_string(mapping_exists.manychat_phone or "", history.payload, parsed_data)
            
            if getattr(mapping_exists, "manychat_tag_automation", False):
                mc_tag = compute_dynamic_manychat_tag(mapping_exists)
            else:
                mc_tag = mapping_exists.manychat_tag
            
            logger.info(f"➕ [SYNC MANYCHAT] Agendando sincronização para {mc_phone} ({mc_name}) com tag '{mc_tag}'")
            background_tasks.add_task(sync_to_manychat, integration.client_id, mc_name, mc_phone, mc_tag)
    except Exception as e:
        logger.error(f"Erro ao sincronizar lead no sync individual: {e}")

    db.commit()
    return {"status": "success", "processed_data": parsed_data, "new_status": history.status}

@router.post("/webhooks/{integration_id}/sync-all", summary="Sincronizar todo o histórico da integração")
@router.post("/webhook-integrations/{integration_id}/sync-all", include_in_schema=False)
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

    count = 0
    from .webhooks_public import parse_webhook_payload
    
    # Pre-fetch mappings to optimize
    mappings = db.query(models.WebhookEventMapping).filter(
        models.WebhookEventMapping.integration_id == uuid_obj
    ).all()
    mapping_event_types = {m.event_type.lower() for m in mappings}

    for history in histories:
        try:
            if not history.payload: continue
            
            parsed_data = parse_webhook_payload(integration.platform, history.payload)
            history.processed_data = parsed_data
            history.event_type = parsed_data.get("event_type", "").lower()
            
            # Status management based on mappings
            if history.event_type in mapping_event_types and history.status == "ignored":
                history.status = "processed"
            elif history.event_type not in mapping_event_types and history.status == "processed":
                history.status = "ignored"

            # If error was due to missing phone but phone is now found, recover the entry
            if (history.status == "error" and
                    history.error_message and "Telefone Ausente" in history.error_message and
                    parsed_data.get("phone")):
                if history.event_type in mapping_event_types:
                    history.status = "processed"
                else:
                    history.status = "ignored"
                history.error_message = None

            # NEW: Sync to WebhookLead as well
            if parsed_data.get("phone"):
                # Collect all unique labels (chatwoot_label) and internal tags from mapping
                tag_list = []
                m_obj = next((m for m in mappings if m.event_type.lower() == history.event_type), None)
                if m_obj:
                    if m_obj.chatwoot_label:
                        # ROBUST EXTRACTION: Use shared utility to handle lists, JSON strings or comma-separated strings
                        from core.utils import robust_extract_labels
                        current_raw = robust_extract_labels(m_obj.chatwoot_label)
                        
                        if current_raw:
                            tag_list.extend([str(t).strip() for t in current_raw if t])
                    if getattr(m_obj, "internal_tags", None):
                        tag_list.extend([t.strip() for t in m_obj.internal_tags.split(',') if t.strip()])
                
                tag = ", ".join(list(dict.fromkeys(tag_list))) if tag_list else None
                upsert_webhook_lead(db, integration.client_id, integration.platform, parsed_data, event_time=history.created_at, force_time=True, tag=tag)

                # --- ManyChat Sync (Optional addition for Sync-All if manychat is active) ---
                if m_obj and getattr(m_obj, "manychat_active", False):
                    from .webhooks_public import replace_variables_in_string
                    from services.manychat import sync_to_manychat
                    from services.webhooks import compute_dynamic_manychat_tag
                    
                    mc_name = replace_variables_in_string(m_obj.manychat_name or "", history.payload, parsed_data)
                    mc_phone = replace_variables_in_string(m_obj.manychat_phone or "", history.payload, parsed_data)
                    
                    if getattr(m_obj, "manychat_tag_automation", False):
                        mc_tag = compute_dynamic_manychat_tag(m_obj)
                    else:
                        mc_tag = m_obj.manychat_tag
                    
                    # We can use background_tasks or just call it? Better via background_tasks
                    background_tasks.add_task(sync_to_manychat, integration.client_id, mc_name, mc_phone, mc_tag)
            
            count += 1
        except Exception as e:
            logger.error(f"Error syncing history {history.id}: {e}")

    db.commit()

    # Limpeza de duplicatas: mantém só o registro mais antigo por (phone + event_type + janela de 5 min)
    from sqlalchemy import text
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

    if deleted_dupes:
        logger.info(f"🧹 [SYNC ALL] {deleted_dupes} duplicata(s) removida(s) do histórico.")

    logger.info(f"✅ [SYNC ALL] {count} registros processados e leads atualizados.")
    return {"status": "success", "synced_count": count, "duplicates_removed": deleted_dupes}

@router.get("/webhooks/{integration_id}/dispatches", response_model=schemas.TriggerListResponse, summary="Listar histórico de disparos e agendamentos")
@router.get("/webhook-integrations/{integration_id}/dispatches", include_in_schema=False)
def list_dispatches(
    integration_id: str,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    search: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    type_filter: Optional[str] = Query(None),  # free | paid | cancelled
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    # Verify integration
    integration = db.query(models.WebhookIntegration).filter(
        models.WebhookIntegration.id == uuid_obj,
        models.WebhookIntegration.client_id == x_client_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    from sqlalchemy import cast, String
    query = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == x_client_id,
        cast(models.ScheduledTrigger.integration_id, String) == str(uuid_obj),
    )

    if status:
        query = query.filter(models.ScheduledTrigger.status == status)

    if type_filter == 'cancelled':
        query = query.filter(models.ScheduledTrigger.status == 'cancelled')
    elif type_filter == 'free':
        query = query.filter(
            models.ScheduledTrigger.status != 'cancelled',
            models.ScheduledTrigger.sent_as == 'FREE_MESSAGE'
        )
    elif type_filter == 'paid':
        query = query.filter(
            models.ScheduledTrigger.status != 'cancelled',
            models.ScheduledTrigger.sent_as == 'TEMPLATE'
        )

    if event_type:
        query = query.filter(models.ScheduledTrigger.event_type == event_type)

    if search and search.strip():
        search = search.strip()
        from sqlalchemy import or_
        
        # Normalização para busca de telefone: Remove caracteres não numéricos
        clean_search = "".join(filter(str.isdigit, search))
        
        search_filters = [
            models.ScheduledTrigger.contact_name.ilike(f"%{search}%"),
            models.ScheduledTrigger.contact_phone.ilike(f"%{search}%")
        ]
        
        # Se a busca limpa tiver dígitos suficientes, adiciona filtro extra
        if clean_search and len(clean_search) >= 4:
            search_filters.append(models.ScheduledTrigger.contact_phone.ilike(f"%{clean_search}%"))
            
        query = query.filter(or_(*search_filters))
    
    BRASILIA_OFFSET = timedelta(hours=3)  # Brasília = UTC-3

    if start_date:
        try:
            if "T" in start_date:
                start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
            else:
                # Data pura YYYY-MM-DD: interpretar como meia-noite de Brasília (= +3h em UTC)
                start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc) + BRASILIA_OFFSET
            query = query.filter(models.ScheduledTrigger.created_at >= start_dt)
        except Exception:
            pass

    if end_date:
        try:
            if "T" in end_date:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=timezone.utc)
            else:
                # Data pura YYYY-MM-DD: interpretar como 23:59:59 de Brasília (= dia seguinte +2:59:59 em UTC)
                end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) + BRASILIA_OFFSET
            query = query.filter(models.ScheduledTrigger.created_at <= end_dt)
        except Exception:
            pass
    
    total = query.count()
    items = query.order_by(models.ScheduledTrigger.created_at.desc()).offset(skip).limit(limit).all()

    # Backfill sent_as from MessageStatus for historical records and persist to DB
    backfilled = False
    for trigger in items:
        if trigger.sent_as is None and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            if first_msg.message_type:
                trigger.sent_as = first_msg.message_type
                backfilled = True
    if backfilled:
        db.commit()

    return {"items": items, "total": total}


META_CATEGORY_PRICES_BRL = {
    "marketing":      0.35,
    "utility":        0.07,
    "service":        0.00,
    "authentication": 0.15,
}

@router.post("/webhook-integrations/{integration_id}/backfill-costs", summary="Recalcular custos históricos dos disparos")
def backfill_dispatch_costs(
    integration_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Para disparos TEMPLATE sem custo registrado, calcula retroativamente usando:
    1. meta_price_category do MessageStatus (se disponível)
    2. cost_per_message do mapeamento correspondente (se configurado)
    3. Preço padrão marketing (R$ 0.35) como fallback
    """
    from sqlalchemy import or_, cast, String
    try:
        uuid_obj = uuid.UUID(integration_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == x_client_id,
        cast(models.ScheduledTrigger.integration_id, String) == str(uuid_obj),
        or_(
            models.ScheduledTrigger.total_cost == None,
            models.ScheduledTrigger.total_cost == 0
        ),
        models.ScheduledTrigger.total_sent > 0
    ).options(joinedload(models.ScheduledTrigger.messages)).all()

    # Buscar mapeamentos da integração para obter cost_per_message configurado
    mappings = db.query(models.WebhookEventMapping).filter(
        cast(models.WebhookEventMapping.integration_id, String) == str(uuid_obj)
    ).all()
    mapping_costs = {m.event_type: (m.cost_per_message or 0.0) for m in mappings}

    updated = 0
    for trigger in triggers:
        # Só recalcula TEMPLATE (não FREE_MESSAGE)
        sent_as = trigger.sent_as
        if not sent_as and trigger.messages:
            first_msg = min(trigger.messages, key=lambda m: m.id)
            sent_as = first_msg.message_type if first_msg else None

        if sent_as != 'TEMPLATE':
            continue

        # Determinar custo por mensagem
        cost_per_msg = 0.0

        # 1. Verificar se algum MessageStatus tem categoria do Meta
        for msg in trigger.messages:
            if msg.meta_price_category and msg.meta_price_category in META_CATEGORY_PRICES_BRL:
                cost_per_msg = META_CATEGORY_PRICES_BRL[msg.meta_price_category]
                break

        # 2. Fallback: custo configurado no mapeamento
        if cost_per_msg == 0.0 and trigger.event_type in mapping_costs:
            cost_per_msg = mapping_costs[trigger.event_type]

        # 3. Fallback final: preço padrão marketing
        if cost_per_msg == 0.0:
            cost_per_msg = META_CATEGORY_PRICES_BRL["marketing"]

        # Calcular custo total = custo × mensagens entregues
        new_total = round(cost_per_msg * (trigger.total_delivered or 1), 4)
        trigger.total_cost = new_total
        trigger.cost_per_unit = cost_per_msg
        if trigger.sent_as is None:
            trigger.sent_as = 'TEMPLATE'
        updated += 1

    db.commit()
    return {
        "status": "success",
        "updated": updated,
        "message": f"{updated} disparo(s) com custo recalculado."
    }


@router.post("/webhooks/dispatches/{dispatch_id}/play", summary="Disparar agora um agendamento")
@router.post("/webhook-integrations/dispatches/{dispatch_id}/play", include_in_schema=False)
async def play_dispatch(
    dispatch_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == dispatch_id,
        models.ScheduledTrigger.client_id == x_client_id
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    
    # Allow re-triggering (re-queuing)

    from rabbitmq_client import rabbitmq
    
    # Update to processing and publish
    trigger.status = "processing"
    trigger.scheduled_time = datetime.now(timezone.utc)
    db.commit()

    await rabbitmq.publish("zapvoice_funnel_executions", {
        "trigger_id": trigger.id,
        "funnel_id": trigger.funnel_id,
        "conversation_id": trigger.conversation_id,
        "contact_phone": trigger.contact_phone
    })

    return {"status": "success", "message": "Disparo enviado para a fila com prioridade."}

@router.delete("/webhooks/dispatches/{dispatch_id}", summary="Cancelar/Excluir um agendamento")
@router.delete("/webhook-integrations/dispatches/{dispatch_id}", include_in_schema=False)
def cancel_dispatch(
    dispatch_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == dispatch_id,
        models.ScheduledTrigger.client_id == x_client_id
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    
    # Allow deletion regardless of status

    db.delete(trigger)
    db.commit()
    return {"status": "success", "message": "Agendamento cancelado e removido."}

@router.post("/webhooks/dispatches/bulk-play", summary="Disparar múltiplos agendamentos em massa")
@router.post("/webhook-integrations/dispatches/bulk-play", include_in_schema=False)
async def bulk_play_dispatches(
    dispatch_ids: List[int],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from rabbitmq_client import rabbitmq
    
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id.in_(dispatch_ids),
        models.ScheduledTrigger.client_id == x_client_id
    ).all()
    
    count = 0
    for trigger in triggers:
        # Allow re-triggering
            
        trigger.status = "processing"
        trigger.scheduled_time = datetime.now(timezone.utc)
        
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": trigger.funnel_id,
            "conversation_id": trigger.conversation_id,
            "contact_phone": trigger.contact_phone
        })
        count += 1
        
    db.commit()
    return {"status": "success", "triggered_count": count}

@router.post("/webhooks/dispatches/bulk-delete", summary="Excluir múltiplos agendamentos em massa")
@router.post("/webhook-integrations/dispatches/bulk-delete", include_in_schema=False)
async def bulk_delete_dispatches(
    dispatch_ids: List[int],
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Obter IDs que realmente pertencem ao cliente (SEGURANÇA)
    valid_ids_query = db.query(models.ScheduledTrigger.id).filter(
        models.ScheduledTrigger.id.in_(dispatch_ids),
        models.ScheduledTrigger.client_id == x_client_id
    )
    valid_ids = [row[0] for row in valid_ids_query.all()]
    
    if not valid_ids:
        return {"status": "success", "deleted_count": 0}

    # 2. Remover MessageStatus dependentes primeiro (Evita ForeignKeyViolation)
    db.query(models.MessageStatus).filter(
        models.MessageStatus.trigger_id.in_(valid_ids)
    ).delete(synchronize_session=False)

    # 3. Remover ScheduledTriggers (inclui cascade ORM se houverem filhos auto-referenciais e DB CASCADE)
    deleted_count = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id.in_(valid_ids)
    ).delete(synchronize_session=False)
    
    db.commit()
    logger.info(f"🗑️ [BULK DELETE] {deleted_count} disparos e seus status removidos pelo usuário {current_user.email}")
    
    return {"status": "success", "deleted_count": deleted_count}
@router.post("/webhooks/{integration_id}/discover-products", summary="Descobrir produtos no histórico")
@router.post("/webhook-integrations/{integration_id}/discover-products", include_in_schema=False)
def discover_integration_products(
    integration_id: str,
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

    # Buscar todo o histórico desta integração — sempre re-escaneia do zero
    history = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.integration_id == uuid_obj
    ).all()

    discovered = set()

    for entry in history:
        payload = entry.payload
        if not payload:
            continue

        parsed = parse_webhook_payload(integration.platform, payload)
        product_name = parsed.get("product_name")

        # Ignorar order bumps
        is_bump = parsed.get("order_bump") or parsed.get("e_order_bump")

        if product_name and not is_bump:
            parts = [p.strip() for p in str(product_name).split('|')]
            for p in parts:
                p_clean = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$|R\$ )[\d\.,\s]+[^)]*?\)', '', p)
                p_clean = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', p_clean).strip()
                if p_clean:
                    discovered.add(p_clean)

    discovered_list = sorted(list(discovered))
    integration.discovered_products = discovered_list
    db.commit()
    db.refresh(integration)

    return {
        "message": f"Descoberta concluída. {len(discovered_list)} produto(s) encontrado(s) no histórico.",
        "total_discovered": len(discovered_list),
        "discovered_products": discovered_list
    }

@router.get("/webhook-integrations/record/{record_id}/status", summary="Buscar status detalhado de um disparo")
def get_record_dispatch_status(
    record_id: str,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        uuid_obj = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    # 1. Buscar o registro de histórico
    record = db.query(models.WebhookHistory).filter(
        models.WebhookHistory.id == uuid_obj,
        models.WebhookHistory.integration_id.in_(
            db.query(models.WebhookIntegration.id).filter(models.WebhookIntegration.client_id == x_client_id)
        )
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # 2. Buscar o ScheduledTrigger associado (usando o integration_id que guardamos no trigger)
    # Nota: Em webhooks, o integration_id no ScheduledTrigger aponta para o ID do WebhookHistory (UUID)
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.integration_id == uuid_obj
    ).order_by(models.ScheduledTrigger.created_at.desc()).first()

    # Se não houver trigger, retornamos o status básico do registro
    if not trigger:
        return {
            "record_status": record.status,
            "has_trigger": False,
            "execution_history": [],
            "status": record.status
        }

    # 3. Retornar dados combinados para o Pipeline Monitor
    return {
        "id": trigger.id,
        "status": trigger.status,
        "total_sent": trigger.total_sent,
        "total_delivered": trigger.total_delivered,
        "total_read": trigger.total_read,
        "total_failed": trigger.total_failed,
        "failure_reason": trigger.failure_reason,
        "execution_history": trigger.execution_history or [],
        "scheduled_time": trigger.scheduled_time.isoformat() if trigger.scheduled_time else None,
        "created_at": trigger.created_at.isoformat() if trigger.created_at else None,
        "has_trigger": True
    }

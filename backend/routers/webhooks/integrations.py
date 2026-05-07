from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import uuid
import json
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id
from core.logger import logger

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[schemas.WebhookIntegration], summary="Listar todas integrações de webhooks")
@router.get("/", response_model=List[schemas.WebhookIntegration], include_in_schema=False)
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

@router.get("/{integration_id}", response_model=schemas.WebhookIntegration, summary="Obter detalhes de uma integração")
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

@router.post("", response_model=schemas.WebhookIntegration, summary="Criar nova integração de webhook")
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
        db.flush()
        
        if integration.mappings:
            for mapping in integration.mappings:
                safe_template_id = None
                if mapping.template_id:
                    tid_raw = str(mapping.template_id).strip().lower()
                    if tid_raw.isdigit():
                        safe_template_id = int(tid_raw)

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
                    manychat_tag_include_date=getattr(mapping, 'manychat_tag_include_date', True),
                    manychat_tag_prefix=getattr(mapping, 'manychat_tag_prefix', None),
                    manychat_tag_rotation_time=getattr(mapping, 'manychat_tag_rotation_time', "08:00"),
                    manychat_tag_rotation_day=getattr(mapping, 'manychat_tag_rotation_day', 0),
                    product_name=getattr(mapping, 'product_name', None),
                    is_active=mapping.is_active
                )
                db.add(db_mapping)
            
        db.commit()
        
        new_integration = db.query(models.WebhookIntegration).options(
            joinedload(models.WebhookIntegration.mappings)
        ).filter(models.WebhookIntegration.id == db_integration.id).first()
        
        return new_integration
    except Exception as e:
        db.rollback()
        logger.error(f"ERROR creating integration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao salvar: {str(e)}")

@router.put("/{integration_id}", response_model=schemas.WebhookIntegration, summary="Atualizar integração existente")
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
        logger.info(f"🔄 [WEBHOOKS] Atualizando integração {integration_id} (Client {x_client_id})")
        
        db_integration.name = integration_update.name
        db_integration.platform = integration_update.platform
        db_integration.status = integration_update.status
        db_integration.custom_fields_mapping = integration_update.custom_fields_mapping
        
        raw_slug = getattr(integration_update, 'custom_slug', None)
        if isinstance(raw_slug, str):
            clean_slug = raw_slug.strip().lower()
            db_integration.custom_slug = clean_slug if clean_slug else None
        else:
            db_integration.custom_slug = None

        db_integration.product_filtering = getattr(integration_update, 'product_filtering', False)
        db_integration.product_whitelist = getattr(integration_update, 'product_whitelist', [])
        db_integration.discovered_products = getattr(integration_update, 'discovered_products', [])
        
        # Limpar mapeamentos antigos
        db.query(models.WebhookEventMapping).filter(
            models.WebhookEventMapping.integration_id == uuid_obj
        ).delete(synchronize_session='fetch')
        db.flush()
        
        if integration_update.mappings:
            for mapping in integration_update.mappings:
                safe_template_id = None
                if mapping.template_id:
                    tid_raw = str(mapping.template_id).strip().lower()
                    if tid_raw and tid_raw not in ["null", "undefined", "none"]:
                        try:
                            safe_template_id = int(tid_raw)
                        except:
                            safe_template_id = None
                
                active_status = mapping.is_active if mapping.is_active is not None else True
                
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
                    manychat_tag_include_date=getattr(mapping, 'manychat_tag_include_date', True),
                    manychat_tag_prefix=getattr(mapping, 'manychat_tag_prefix', None),
                    manychat_tag_rotation_time=getattr(mapping, 'manychat_tag_rotation_time', "08:00"),
                    manychat_tag_rotation_day=getattr(mapping, 'manychat_tag_rotation_day', 0),
                    product_name=getattr(mapping, 'product_name', None),
                    is_active=active_status
                )
                db.add(db_mapping)

        db.commit()
        db.expire_all()
        
        updated_integration = db.query(models.WebhookIntegration).options(
            joinedload(models.WebhookIntegration.mappings)
        ).filter(models.WebhookIntegration.id == uuid_obj).first()
        
        return updated_integration
    except Exception as e:
        db.rollback()
        logger.error(f"ERROR updating integration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao atualizar: {str(e)}")

@router.delete("/{integration_id}", summary="Excluir integração")
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

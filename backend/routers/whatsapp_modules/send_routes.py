from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import cast, Date

import models
import schemas
from database import SessionLocal
from core.deps import get_validated_client_id
from core.permissions import require_premium
from core.logger import setup_logger
from .client_helper import get_chatwoot_client, resolve_client_id

logger = setup_logger(__name__)

router = APIRouter()


@router.post("/send-template", summary="Enviar Template WhatsApp")
async def send_template(
    payload: schemas.WhatsAppTemplateRequest, 
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    x_client_id: Optional[int] = None
):
    try:
        phone = payload.phone_number
        template = payload.template_name
        lang = payload.language
        components = payload.components

        if not phone or not template:
            raise HTTPException(status_code=400, detail="Phone number and template name are required")

        target_client_id = resolve_client_id(client_id, x_client_id)

        client = get_chatwoot_client(client_id=target_client_id)
        logger.info(f"Sending template '{template}' to {phone}")
        result = await client.send_template(phone, template, lang, components)
        
        if not result or (isinstance(result, dict) and result.get("error")):
            err_detail = result.get("detail") if result else "No response from WhatsApp"
            logger.error(f"Failed to send template '{template}' to {phone} - Error: {err_detail}")
            raise HTTPException(status_code=500, detail=f"Erro Meta API: {err_detail}")
        
        try:
            msg_id = None
            if isinstance(result, dict):
                messages = result.get("messages", [])
                if messages:
                    msg_id = messages[0].get("id")
            
            if msg_id:
                db_log = SessionLocal()
                try:
                    today = datetime.now(timezone.utc).date()
                    agg_name = f"Envios Manuais: {template} [{today}]"
                    
                    aggregator = db_log.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.client_id == target_client_id,
                        models.ScheduledTrigger.template_name == agg_name,
                        models.ScheduledTrigger.is_bulk == True,
                        cast(models.ScheduledTrigger.created_at, Date) == today
                    ).first()
                    
                    if not aggregator:
                        aggregator = models.ScheduledTrigger(
                            client_id=target_client_id,
                            template_name=agg_name,
                            is_bulk=True,
                            status='processing',
                            scheduled_time=datetime.now(timezone.utc),
                            contacts_list=[],
                            processed_contacts=[],
                            total_sent=0,
                            total_delivered=0,
                            total_paid_templates=0,
                            total_cost=0.0
                        )
                        db_log.add(aggregator)
                        db_log.commit()
                        db_log.refresh(aggregator)
                    
                    clean_phone = ''.join(filter(str.isdigit, phone))
                    current_list = list(aggregator.contacts_list or [])
                    if clean_phone not in current_list:
                        current_list.append(clean_phone)
                        aggregator.contacts_list = current_list
                        
                    aggregator.total_sent = (aggregator.total_sent or 0) + 1
                    aggregator.updated_at = datetime.now(timezone.utc)
                    
                    # Buscar corpo do template no cache local
                    template_content = f"[Template: {template}]"
                    try:
                        tpl_cache = db_log.query(models.WhatsAppTemplateCache).filter(
                            models.WhatsAppTemplateCache.client_id == target_client_id,
                            models.WhatsAppTemplateCache.name == template
                        ).first()
                        if tpl_cache and tpl_cache.body:
                            template_content = tpl_cache.body
                            try:
                                body_params = []
                                for comp in (components or []):
                                    if comp.get("type") == "body":
                                        for param in comp.get("parameters", []):
                                            if param.get("type") == "text":
                                                body_params.append(str(param.get("text")))
                                for idx, val in enumerate(body_params):
                                    template_content = template_content.replace(f"{{{{{idx+1}}}}}", val)
                            except Exception as e_replace:
                                logger.error(f"Erro ao substituir variáveis do template no log: {e_replace}")
                    except Exception as e_cache:
                        logger.error(f"Erro ao buscar template cache: {e_cache}")

                    msg_status = models.MessageStatus(
                        trigger_id=aggregator.id,
                        message_id=msg_id.replace("wamid.", "") if msg_id else msg_id,
                        phone_number=clean_phone,
                        status='sent',
                        message_type='TEMPLATE',
                        template_name=template,
                        content=template_content,
                        updated_at=datetime.now(timezone.utc)
                    )
                    db_log.add(msg_status)
                    
                    db_log.commit()
                    logger.info(f"✅ [MANUAL SEND] Message tracked! ID: {msg_id} -> Trigger: {aggregator.id}")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to save manual send status: {e}")
                    db_log.rollback()
                finally:
                    db_log.close()
            else:
                logger.warning(f"⚠️ Manual send success but no ID found in result: {result}")

        except Exception as e:
            logger.error(f"❌ Error in manual send tracking block: {e}")
            
        logger.info(f"Template sent successfully to {phone}. Response: {result}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error sending template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

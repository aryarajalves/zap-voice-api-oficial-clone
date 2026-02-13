from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from chatwoot_client import ChatwootClient
import models
import schemas
from fastapi import Depends
from core.deps import get_current_user
from core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])
# client = ChatwootClient() # Removed global instance

@router.get("/debug/env")
async def debug_env():
    import os
    return {
        "whatsapp": {
            "WA_BUSINESS_ACCOUNT_ID": os.getenv("WA_BUSINESS_ACCOUNT_ID"),
            "WA_PHONE_NUMBER_ID": os.getenv("WA_PHONE_NUMBER_ID"),
            "WA_ACCESS_TOKEN_PREFIX": (os.getenv("WA_ACCESS_TOKEN") or "")[:15] + "..."
        },
        "chatwoot": {
            "CHATWOOT_API_URL": os.getenv("CHATWOOT_API_URL"),
            "CHATWOOT_API_TOKEN_PREFIX": (os.getenv("CHATWOOT_API_TOKEN") or "")[:10] + "...",
            "CHATWOOT_ACCOUNT_ID": os.getenv("CHATWOOT_ACCOUNT_ID"),
            "CHATWOOT_SELECTED_INBOX_ID": os.getenv("CHATWOOT_SELECTED_INBOX_ID")
        },
        "database": {
            "DATABASE_URL_HOST": os.getenv("DATABASE_URL", "").split("@")[1].split("/")[0] if "@" in os.getenv("DATABASE_URL", "") else "not_set"
        },
        "frontend": {
            "VITE_API_URL": os.getenv("VITE_API_URL"),
            "VITE_WS_URL": os.getenv("VITE_WS_URL")
        },

    }

@router.get("/templates")
async def list_templates(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Prefer X-Client-ID header, fallback to user's client_id
        target_client_id = x_client_id if x_client_id else current_user.client_id
        
        # Verify ownership if needed, or loosely allow for single-user-multi-client
        # For now, trust the header if authenticated user
        
        client = ChatwootClient(client_id=target_client_id)
        templates = await client.get_whatsapp_templates()
        return templates or []
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        # Retornar lista vazia em vez de erro 500 para não quebrar frontend
        return []

    return result

@router.post("/templates")
async def create_template(
    payload: schemas.WhatsAppTemplateCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    client = ChatwootClient(client_id=target_client_id)
    
    result = await client.create_whatsapp_template(payload.dict())
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

    return result

@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    payload: schemas.WhatsAppTemplateCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    client = ChatwootClient(client_id=target_client_id)
    
    result = await client.edit_whatsapp_template(template_id, payload.dict())
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.delete("/templates/{template_name}")
async def delete_template(
    template_name: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    client = ChatwootClient(client_id=target_client_id)
    
    result = await client.delete_whatsapp_template(template_name)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result
@router.post("/templates/{template_id}/status")
async def update_template_status(
    template_id: str,
    status: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    client = ChatwootClient(client_id=target_client_id)
    result = await client.update_template_status(template_id, status)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/send-template", summary="Enviar Template WhatsApp")
async def send_template(
    payload: schemas.WhatsAppTemplateRequest, 
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    try:
        phone = payload.phone_number
        template = payload.template_name
        lang = payload.language
        components = payload.components

        if not phone or not template:
            # Should be caught by Pydantic, but keeping for safety
            raise HTTPException(status_code=400, detail="Phone number and template name are required")

        # Prefer X-Client-ID header
        target_client_id = x_client_id if x_client_id else current_user.client_id
        client = ChatwootClient(client_id=target_client_id)
        logger.info(f"Sending template '{template}' to {phone}")
        result = await client.send_template(phone, template, lang, components)
        
        if not result or (isinstance(result, dict) and result.get("error")):
            err_detail = result.get("detail") if result else "No response from WhatsApp"
            logger.error(f"Failed to send template '{template}' to {phone} - Error: {err_detail}")
            raise HTTPException(status_code=500, detail=f"Erro Meta API: {err_detail}")
        
        # ---------------------------------------------------------------------
        # FIX: Save Message Status for Manual Sends to enable Button Tracking
        # ---------------------------------------------------------------------
        try:
            # Extract Message ID
            msg_id = None
            if isinstance(result, dict):
                messages = result.get("messages", [])
                if messages:
                    msg_id = messages[0].get("id")
            
            if msg_id:
                from database import SessionLocal
                from datetime import datetime, timezone
                from sqlalchemy import cast, Date
                
                db_log = SessionLocal()
                try:
                    # 1. Find or Create Aggregator Trigger for Today's Manual Sends
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
                            status='processing', # Always active to collect
                            scheduled_time=datetime.now(timezone.utc),
                            contacts_list=[],
                            processed_contacts=[],
                            total_sent=0
                        )
                        db_log.add(aggregator)
                        db_log.commit()
                        db_log.refresh(aggregator)
                    
                    # 2. Update Aggregator Stats
                    clean_phone = ''.join(filter(str.isdigit, phone))
                    current_list = list(aggregator.contacts_list or [])
                    if clean_phone not in current_list:
                        current_list.append(clean_phone)
                        aggregator.contacts_list = current_list
                        
                    aggregator.total_sent = (aggregator.total_sent or 0) + 1
                    aggregator.updated_at = datetime.now(timezone.utc)
                    
                    # 3. Create Message Status Record
                    msg_status = models.MessageStatus(
                        trigger_id=aggregator.id,
                        message_id=msg_id,
                        phone_number=clean_phone,
                        status='sent',
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
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Unexpected error sending template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


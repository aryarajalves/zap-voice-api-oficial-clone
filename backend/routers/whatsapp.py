from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from typing import Optional
from chatwoot_client import ChatwootClient
import models
import schemas
from fastapi import Depends
from core.deps import get_current_user
from core.logger import setup_logger
from config_loader import get_setting
import httpx

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

@router.get("/labels")
async def list_labels(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    try:
        target_client_id = x_client_id if x_client_id else current_user.client_id
        client = ChatwootClient(client_id=target_client_id)
        labels = await client.get_labels()
        return labels or []
    except Exception as e:
        logger.error(f"Error listing labels: {e}")
        return []

    return result

@router.post("/upload-template-media", summary="Upload de mídia para cabeçalho de template")
async def upload_template_media(
    file: UploadFile = File(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    """
    Faz upload de imagem/vídeo/documento para a Meta Resumable Upload API
    e retorna o header_handle a ser usado na criação de templates.
    """
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    if not wa_token:
        raise HTTPException(status_code=400, detail="WA_ACCESS_TOKEN não configurado.")

    file_bytes = await file.read()
    file_length = len(file_bytes)
    mime_type = file.content_type or "application/octet-stream"

    async with httpx.AsyncClient(timeout=60.0) as http:
        # Step 1: create upload session
        session_res = await http.post(
            "https://graph.facebook.com/v25.0/app/uploads",
            params={
                "file_length": file_length,
                "file_type": mime_type,
                "access_token": wa_token,
            }
        )
        if session_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro ao criar sessão de upload na Meta: {session_res.text}")

        upload_session_id = session_res.json().get("id")
        if not upload_session_id:
            raise HTTPException(status_code=400, detail="Sessão de upload inválida retornada pela Meta.")

        # Step 2: upload the file
        upload_res = await http.post(
            f"https://graph.facebook.com/v25.0/{upload_session_id}",
            headers={
                "Authorization": f"OAuth {wa_token}",
                "file_offset": "0",
                "Content-Type": mime_type,
            },
            content=file_bytes,
        )
        if upload_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro ao fazer upload na Meta: {upload_res.text}")

        handle = upload_res.json().get("h")
        if not handle:
            raise HTTPException(status_code=400, detail="Handle não retornado pela Meta após upload.")

        return {"handle": handle, "filename": file.filename, "mime_type": mime_type}


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


@router.get("/profile", summary="Busca o perfil do WhatsApp Business")
async def get_whatsapp_profile(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        return {"error": "Configurações do WhatsApp incompletas."}

    async with httpx.AsyncClient(timeout=30.0) as http:
        # Busca detalhes do perfil
        res = await http.get(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            params={
                "fields": "about,address,description,email,profile_picture_url,websites,vertical",
                "access_token": wa_token
            }
        )
        
        profile_data = res.json().get("data", [{}])[0]
        
        # Busca detalhes do número (para pegar display_phone_number)
        num_res = await http.get(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}",
            params={"access_token": wa_token}
        )
        if num_res.status_code == 200:
            profile_data["display_phone_number"] = num_res.json().get("display_phone_number", "")
            
        return profile_data


@router.post("/profile-picture", summary="Atualiza a foto de perfil do WhatsApp Business")
async def update_profile_picture(
    file: UploadFile = File(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")

    file_bytes = await file.read()
    file_length = len(file_bytes)
    mime_type = file.content_type or "image/jpeg"

    async with httpx.AsyncClient(timeout=60.0) as http:
        # Step 1: Request Upload Session
        session_res = await http.post(
            "https://graph.facebook.com/v25.0/app/uploads",
            params={
                "file_length": file_length,
                "file_type": mime_type,
                "access_token": wa_token,
            }
        )
        if session_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro ao criar sessão de upload: {session_res.text}")

        upload_session_id = session_res.json().get("id")

        # Step 2: Upload the file
        upload_res = await http.post(
            f"https://graph.facebook.com/v25.0/{upload_session_id}",
            headers={
                "Authorization": f"OAuth {wa_token}",
                "file_offset": "0",
                "Content-Type": mime_type,
            },
            content=file_bytes,
        )
        if upload_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro no upload da imagem: {upload_res.text}")

        handle = upload_res.json().get("h")
        logger.info(f"Upload concluído na Meta. Handle: {handle}")
        if not handle:
            raise HTTPException(status_code=400, detail="Handle não retornado pela Meta.")

        # Step 3: Update Profile
        logger.info(f"Tentando atualizar perfil do WhatsApp {wa_phone_id} na v25.0...")
        update_res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            headers={"Authorization": f"OAuth {wa_token}"},
            json={
                "messaging_product": "whatsapp",
                "profile_picture_handle": handle
            }
        )
        
        if update_res.status_code != 200:
            logger.error(f"Erro ao salvar perfil WhatsApp: {update_res.text}")
            raise HTTPException(status_code=400, detail=f"Erro ao salvar perfil: {update_res.text}")

        logger.info("✅ Foto de perfil do WhatsApp atualizada com sucesso.")
        return {"success": True, "message": "Foto de perfil atualizada com sucesso!"}


@router.post("/profile", summary="Atualiza campos do perfil comercial do WhatsApp")
async def update_whatsapp_profile(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")

    # Filter only allowed fields to avoid errors
    allowed_fields = {"about", "address", "description", "email", "websites", "vertical"}
    filtered_payload = {k: v for k, v in payload.items() if k in allowed_fields}
    filtered_payload["messaging_product"] = "whatsapp"
    
    if not filtered_payload:
        raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar.")

    async with httpx.AsyncClient(timeout=30.0) as http:
        res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            headers={"Authorization": f"OAuth {wa_token}"},
            json=filtered_payload
        )
        
        if res.status_code != 200:
            logger.error(f"Erro ao atualizar perfil WhatsApp: {res.text}")
            raise HTTPException(status_code=400, detail=f"Erro Meta API: {res.text}")

        return {"success": True, "message": "Perfil atualizado com sucesso!"}


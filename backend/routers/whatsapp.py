from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Query
from typing import Optional
from chatwoot_client import ChatwootClient
import models
import schemas
from fastapi import Depends
from core.deps import get_current_user, get_db
from core.permissions import require_premium, require_user
from core.logger import setup_logger
from config_loader import get_setting
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, time

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
    include_archived: bool = Query(False),
    include_paused: bool = Query(True),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    templates = []
    meta_success = False

    try:
        client = ChatwootClient(client_id=target_client_id)
        templates = await client.get_whatsapp_templates()
        meta_success = True
    except Exception as e:
        logger.error(f"Error listing templates from Meta (falling back to cache): {e}")

    # Se a chamada à Meta falhar ou retornar vazia, buscar do banco local
    if not meta_success or not templates:
        logger.info("Using cached templates from database.")
        try:
            cached_templates = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.client_id == target_client_id
            ).all()
            templates = []
            for ct in cached_templates:
                templates.append({
                    "id": str(ct.id),
                    "name": ct.name,
                    "language": ct.language,
                    "category": "MARKETING",
                    "status": "APPROVED",
                    "body_text": ct.body,
                    "components": ct.components or [],
                    "is_archived": ct.is_archived
                })
        except Exception as db_err:
            logger.error(f"Error querying local template cache: {db_err}")

    # Mapear status is_archived do banco local para os templates vindos da Meta
    try:
        archived_templates = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id,
            models.WhatsAppTemplateCache.is_archived == True
        ).all()
        archived_names = {t.name for t in archived_templates}
        
        for t in templates:
            t["is_archived"] = t.get("name") in archived_names
    except Exception as arch_err:
        logger.error(f"Error mapping archived templates: {arch_err}")
        for t in templates:
            if "is_archived" not in t:
                t["is_archived"] = False

    # Filtrar arquivados se include_archived for False
    if not include_archived:
        templates = [t for t in templates if not t.get("is_archived", False)]

    # Filtrar pausados se include_paused for False
    if not include_paused:
        templates = [t for t in templates if (t.get("status") or "").upper() != "PAUSED"]

    # Mesclar as tags locais
    try:
        local_caches = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id
        ).all()
        
        tags_map = {}
        for lc in local_caches:
            if lc.tags:
                tags_map[str(lc.id)] = [t.strip() for t in lc.tags.split(",") if t.strip()]
            else:
                tags_map[str(lc.id)] = []

        for t in templates:
            t_id = str(t.get("id"))
            t["tags"] = tags_map.get(t_id, [])
    except Exception as merge_err:
        logger.error(f"Error merging template tags: {merge_err}")
        for t in templates:
            if "tags" not in t:
                t["tags"] = []

    return templates

@router.post("/templates/{template_name}/archive")
async def archive_template(
    template_name: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    db_tpl = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).first()
    if not db_tpl:
        try:
            client = ChatwootClient(client_id=target_client_id)
            meta_tpls = await client.get_whatsapp_templates()
            db_tpl = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.name == template_name,
                models.WhatsAppTemplateCache.client_id == target_client_id
            ).first()
        except Exception as e:
            logger.error(f"Error fetching templates from Meta to archive: {e}")
            
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template não encontrado no cache local.")
    
    db_tpl.is_archived = True
    db.commit()
    return {"status": "success", "message": "Template arquivado com sucesso."}

@router.post("/templates/{template_name}/unarchive")
async def unarchive_template(
    template_name: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    db_tpl = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).first()
    if not db_tpl:
        raise HTTPException(status_code=404, detail="Template não encontrado no cache local.")
    
    db_tpl.is_archived = False
    db.commit()
    return {"status": "success", "message": "Template desarquivado com sucesso."}

@router.put("/templates/{template_id}/tags")
async def update_template_tags(
    template_id: str,
    payload: schemas.TemplateTagsUpdate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    
    try:
        int_id = int(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de template inválido. Deve ser numérico.")

    # Busca o template no banco
    db_tpl = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.id == int_id,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).first()
    
    if not db_tpl:
        # Se não existe no banco, podemos criá-lo (caso o usuário clique logo após sync)
        # Mas para garantir, tentamos criar um registro básico ou retornar 404.
        # Vamos retornar 404, pois em teoria list_templates sincroniza e cria o cache.
        raise HTTPException(
            status_code=404, 
            detail="Template não encontrado no cache local. Atualize a lista de templates primeiro."
        )
        
    clean_tags = [tag.strip() for tag in payload.tags if tag.strip()]
    db_tpl.tags = ",".join(clean_tags) if clean_tags else None
    
    try:
        db.commit()
        db.refresh(db_tpl)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao salvar tags do template {template_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor ao salvar etiquetas.")
    
    return {
        "success": True, 
        "template_id": template_id, 
        "tags": clean_tags
    }

@router.delete("/templates/tags/{tag}")
async def delete_template_tag_global(
    tag: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    clean_tag = tag.strip().lower()
    if not clean_tag:
        raise HTTPException(status_code=400, detail="Nome da etiqueta inválido.")

    logger.info(f"🗑️ [TAG_DELETE_GLOBAL] Iniciando deleção da etiqueta '{clean_tag}' para o cliente {target_client_id}")

    try:
        db_tpls = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id,
            models.WhatsAppTemplateCache.tags.isnot(None)
        ).all()

        updated_count = 0
        for tpl in db_tpls:
            current_tags = [t.strip().lower() for t in tpl.tags.split(",") if t.strip()]
            if clean_tag in current_tags:
                new_tags = [t for t in current_tags if t != clean_tag]
                tpl.tags = ",".join(new_tags) if new_tags else None
                updated_count += 1

        if updated_count > 0:
            db.commit()
            logger.info(f"✅ [TAG_DELETE_GLOBAL] Etiqueta '{clean_tag}' removida com sucesso de {updated_count} templates.")
        else:
            logger.info(f"ℹ️ [TAG_DELETE_GLOBAL] Nenhuma ocorrência da etiqueta '{clean_tag}' encontrada para o cliente {target_client_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ [TAG_DELETE_GLOBAL] Erro ao deletar etiqueta global '{clean_tag}': {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor ao deletar etiqueta global.")

    return {
        "success": True,
        "tag": clean_tag,
        "removed_from_count": updated_count
    }

@router.get("/labels")
async def list_labels(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user)
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
    current_user: models.User = Depends(require_premium)
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
    current_user: models.User = Depends(require_premium)
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
    current_user: models.User = Depends(require_premium)
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
    current_user: models.User = Depends(require_premium)
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
    current_user: models.User = Depends(require_premium)
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
    current_user: models.User = Depends(require_premium)
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
                            total_sent=0,
                            total_delivered=0,
                            total_paid_templates=0,
                            total_cost=0.0
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
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        return {"error": "Configurações do WhatsApp incompletas."}

    async with httpx.AsyncClient(timeout=30.0) as http:
        # 1. Busca detalhes do perfil
        res = await http.get(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/whatsapp_business_profile",
            params={
                "fields": "about,address,description,email,profile_picture_url,websites,vertical",
                "access_token": wa_token
            }
        )
        
        profile_data = res.json().get("data", [{}])[0]
        
        # 2. Busca detalhes do número (para pegar display_phone_number, messaging_limit_tier e verified_name)
        num_res = await http.get(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}",
            params={
                "fields": "display_phone_number,messaging_limit_tier,quality_rating,verified_name,name_status",
                "access_token": wa_token
            }
        )
        if num_res.status_code == 200:
            num_data = num_res.json()
            profile_data["display_phone_number"] = num_data.get("display_phone_number", "")
            profile_data["messaging_limit_tier"] = num_data.get("messaging_limit_tier", "TIER_250")
            profile_data["quality_rating"] = num_data.get("quality_rating", "UNKNOWN")
            profile_data["verified_name"] = num_data.get("verified_name", "")
            profile_data["name_status"] = num_data.get("name_status", "APPROVED")

        # 3. Busca status da conta empresarial (WABA/BM Verification)
        wa_waba_id = get_setting("WA_BUSINESS_ACCOUNT_ID", "", client_id=client_id)
        if wa_waba_id:
            try:
                waba_res = await http.get(
                    f"https://graph.facebook.com/v25.0/{wa_waba_id}",
                    params={
                        "fields": "verification_status,account_review_status,name,message_template_namespace",
                        "access_token": wa_token
                    }
                )
                if waba_res.status_code == 200:
                    waba_data = waba_res.json()
                    logger.info(f"WABA Data for {wa_waba_id}: {waba_data}")
                    
                    # Se verification_status for 'not_verified' mas account_review_status for 'APPROVED', 
                    # pode ser que a Meta considere como funcionalmente verificada para templates.
                    profile_data["verification_status"] = waba_data.get("verification_status", "not_verified")
                    profile_data["account_review_status"] = waba_data.get("account_review_status", "")
                    
                    # Tentar buscar status da BM vinculada se possível
                    # fields=business{verification_status}
                    bm_res = await http.get(
                        f"https://graph.facebook.com/v25.0/{wa_waba_id}",
                        params={
                            "fields": "business",
                            "access_token": wa_token
                        }
                    )
                    if bm_res.status_code == 200:
                        bm_info = bm_res.json().get("business")
                        if bm_info:
                            logger.info(f"BM Info for WABA {wa_waba_id}: {bm_info}")
                            # Se a BM estiver verificada, sobrepomos o status da WABA para fins de exibição
                            if bm_info.get("verification_status") == "verified":
                                profile_data["verification_status"] = "verified"
            except Exception as e:
                logger.error(f"Erro ao buscar status de verificação da WABA: {e}")

        # 4. Calcular envios realizados hoje via Banco de Dados

        # 4. Calcular envios realizados hoje via Banco de Dados
        try:
            # Início do dia em UTC
            today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min).replace(tzinfo=timezone.utc)
            
            # Encontrar todos os clients que usam o mesmo WA_PHONE_NUMBER_ID
            # Isso é necessário porque o limite da Meta é compartilhado pelo número
            sibling_client_ids = db.query(models.AppConfig.client_id)\
                .filter(models.AppConfig.key == 'WA_PHONE_NUMBER_ID', models.AppConfig.value == wa_phone_id)\
                .all()
            sibling_ids = [c[0] for c in sibling_client_ids]

            # Contar MessageStatus vinculados a esses client_ids
            usage_count = db.query(func.count(models.MessageStatus.id))\
                .join(models.ScheduledTrigger, models.MessageStatus.trigger_id == models.ScheduledTrigger.id)\
                .filter(
                    models.ScheduledTrigger.client_id.in_(sibling_ids),
                    models.MessageStatus.timestamp >= today_start,
                    models.MessageStatus.status != 'failed' # Não contar falhas
                ).scalar() or 0
            
            profile_data["current_usage"] = usage_count
        except Exception as e:
            logger.error(f"Erro ao calcular uso de mensagens: {e}")
            profile_data["current_usage"] = 0
            
        return profile_data


@router.post("/profile-picture", summary="Atualiza a foto de perfil do WhatsApp Business")
async def update_profile_picture(
    file: UploadFile = File(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
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
    current_user: models.User = Depends(require_premium)
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


@router.post("/profile-name", summary="Atualiza o nome de exibição do WhatsApp Business")
async def update_whatsapp_name(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)
    new_name = payload.get("display_name")

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")
    
    if not new_name:
        raise HTTPException(status_code=400, detail="O nome de exibição é obrigatório.")

    async with httpx.AsyncClient(timeout=30.0) as http:
        # Step 1: Solicitar alteração de nome na Meta
        res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}",
            params={"access_token": wa_token},
            json={"display_name": new_name}
        )
        
        if res.status_code != 200:
            logger.error(f"Erro ao atualizar nome WhatsApp: {res.text}")
            raise HTTPException(status_code=400, detail=f"Erro Meta API: {res.text}")

        return {"success": True, "message": "Solicitação de alteração de nome enviada. A Meta analisará a mudança."}

@router.post("/register-number", summary="Registra o número de telefone (Ativa certificado de nome)")
async def register_whatsapp_number(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=client_id)

    if not wa_token or not wa_phone_id:
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp incompletas.")

    wa_pin = get_setting("WA_PIN", "123456", client_id=client_id)

    async with httpx.AsyncClient(timeout=30.0) as http:
        # Tenta registrar o número para ativar o certificado do nome aprovado
        res = await http.post(
            f"https://graph.facebook.com/v25.0/{wa_phone_id}/register",
            headers={"Authorization": f"Bearer {wa_token}"},
            json={
                "messaging_product": "whatsapp",
                "pin": wa_pin
            }
        )
        
        if res.status_code != 200:
            logger.error(f"Erro ao registrar número: {res.text}")
            # Se der erro de PIN, avisar
            if "pin" in res.text.lower():
                return {"success": False, "error": "PIN incorreto ou necessário. Verifique no painel da Meta."}
            raise HTTPException(status_code=400, detail=f"Erro ao registrar: {res.text}")

        return {"success": True, "message": "Número registrado com sucesso! O nome deve aparecer em breve."}

@router.get("/debug/meta/{waba_id}")
async def debug_meta(
    waba_id: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        res = await http.get(
            f"https://graph.facebook.com/v25.0/{waba_id}",
            params={
                "fields": "verification_status,account_review_status,name,message_template_namespace,business",
                "access_token": wa_token
            }
        )
        return {
            "status_code": res.status_code,
            "data": res.json()
        }


@router.post("/assistant/chat")
async def assistant_chat(
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    import os
    import json
    target_client_id = x_client_id if x_client_id else current_user.client_id
    messages = payload.get("messages", [])
    
    # 1. Buscar templates ativos para o contexto
    active_templates = []
    try:
        active_templates = await list_templates(
            include_archived=False,
            include_paused=False,
            x_client_id=target_client_id,
            current_user=current_user,
            db=db
        )
    except Exception as e:
        logger.error(f"Erro ao obter templates ativos para o contexto do assistente: {e}")

    # 2. Construir o system prompt
    system_prompt = (
        "Você é o assistente inteligente de criação de templates do ZapVoice (ZapVoice IA).\n"
        "Seu objetivo é ajudar o usuário a criar templates de mensagens para o WhatsApp Business da Meta de alta conversão.\n\n"
        "Aqui estão os templates ativos atuais do projeto para você estudar e manter a mesma identidade visual, tom e estilo:\n"
    )
    
    # Serializar templates para estudo
    templates_str = ""
    for tpl in active_templates:
        tpl_min = {
            "name": tpl.get("name"),
            "category": tpl.get("category"),
            "language": tpl.get("language"),
            "body_text": tpl.get("body_text") or "",
            "components": tpl.get("components") or []
        }
        templates_str += f"- Template: {json.dumps(tpl_min, ensure_ascii=False)}\n"
        
    if not templates_str:
        templates_str = "(Nenhum template ativo encontrado ainda no projeto. Crie o primeiro com o usuário!)\n"
        
    system_prompt += templates_str + "\n"
    system_prompt += (
        "INSTRUÇÕES CRÍTICAS:\n"
        "1. Dê feedbacks e conselhos sobre como escrever ótimas mensagens (tome como base as regras do WhatsApp, sem links enganosos, textos claros, etc.).\n"
        "2. Quando propor ou fechar a estrutura de um template com o usuário, você DEVE retornar a sugestão estruturada do template em formato JSON no final da sua mensagem, dentro de um bloco de código de marcação Markdown no formato exato:\n"
        "```json\n"
        "{\n"
        "  \"name\": \"nome_do_template_em_minusculo_com_sublinhados\",\n"
        "  \"category\": \"MARKETING\",\n"
        "  \"language\": \"pt_BR\",\n"
        "  \"header_type\": \"NONE\",\n"
        "  \"header_text\": \"Texto do cabeçalho se aplicável\",\n"
        "  \"body_text\": \"Corpo da mensagem com {{1}} para variáveis se necessário\",\n"
        "  \"footer_text\": \"Rodapé opcional\",\n"
        "  \"buttons\": [\n"
        "     { \"type\": \"QUICK_REPLY\", \"text\": \"Texto do Botão 1\" }\n"
        "  ]\n"
        "}\n"
        "```\n"
        "Observação de botões: suportamos QUICK_REPLY, PHONE_NUMBER (com chave phone_number) e URL (com chave url). Máximo 10 botões.\n"
        "Você deve incluir esse bloco json se e somente se o usuário pedir para criar ou fechar o template de mensagem, ou quando você finalizar a sugestão perfeita de template. O botão 'Aplicar ao Formulário' aparecerá para o usuário baseado nesse bloco."
    )

    # 3. Chamar OpenAI usando httpx
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        logger.error("OPENAI_API_KEY não configurada no backend.")
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY não configurada no backend. Por favor, adicione-a ao arquivo .env."
        )

    openai_model = os.getenv("OPENAI_API_MODEL", "gpt-5-mini")
    
    # Construir histórico de mensagens
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role", "user")
        if role in ["user", "assistant"]:
            api_messages.append({"role": role, "content": msg.get("content", "")})

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            openai_res = await http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": openai_model,
                    "messages": api_messages
                }
            )
            
            if openai_res.status_code != 200:
                err_body = openai_res.text
                logger.error(f"Erro na API da OpenAI ({openai_res.status_code}): {err_body}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro ao chamar OpenAI ({openai_res.status_code}): {err_body}"
                )
                
            res_json = openai_res.json()
            assistant_message = res_json["choices"][0]["message"]["content"]
            
            return {
                "role": "assistant",
                "content": assistant_message
            }
    except httpx.HTTPError as he:
        logger.error(f"Erro de conexão HTTP ao chamar OpenAI: {he}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro de conexão com o servidor da OpenAI: {str(he)}"
        )
    except Exception as exc:
        logger.error(f"Erro inesperado no chat do assistente: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado no assistente: {str(exc)}"
        )



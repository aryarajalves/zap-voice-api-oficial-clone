from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Query
from typing import Optional
from chatwoot_client import ChatwootClient
import models
import schemas
from fastapi import Depends
from core.deps import get_current_user, get_db
from core.permissions import require_premium, require_user, require_feature
from core.logger import setup_logger
from config_loader import get_setting
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, time

logger = setup_logger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

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

from pydantic import BaseModel

class TestTokenRequest(BaseModel):
    phone_number_id: str
    access_token: str
    business_account_id: Optional[str] = None

@router.post("/test-token")
async def test_whatsapp_token(
    request: TestTokenRequest,
    current_user: models.User = Depends(get_current_user),
    x_client_id: Optional[int] = Header(None)
):
    """
    Testa a validade do Token de Acesso permanente da Meta contra a Graph API.
    """
    token = request.access_token.strip()
    phone_id = request.phone_number_id.strip()
    
    # Se o token vier mascarado (contendo asteriscos), recupera o token real salvo no banco
    if "*" in token:
        if not x_client_id:
            raise HTTPException(
                status_code=400,
                detail="Header X-Client-ID necessário para validar o token salvo."
            )
        from config_loader import get_setting
        token = get_setting("WA_ACCESS_TOKEN", client_id=x_client_id)
        if not token:
            raise HTTPException(
                status_code=400,
                detail="Nenhum token de acesso salvo foi encontrado para este cliente."
            )
            
    if not token or not phone_id:
        raise HTTPException(
            status_code=400,
            detail="Token de acesso e ID do número de telefone são obrigatórios."
        )
        
    url = f"https://graph.facebook.com/v20.0/{phone_id}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message": "Token e Phone Number ID válidos e conectados com sucesso à Meta!",
                    "details": data
                }
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", "Erro desconhecido na API da Meta.")
                    error_code = error_data.get("error", {}).get("code", response.status_code)
                except Exception:
                    error_msg = response.text or "Erro desconhecido."
                    error_code = response.status_code
                    
                raise HTTPException(
                    status_code=400,
                    detail=f"Falha na validação (Meta Code {error_code}): {error_msg}"
                )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro de conexão ao testar token com a Meta: {str(e)}"
            )

@router.get("/templates")
async def list_templates(
    include_archived: bool = Query(False),
    include_paused: bool = Query(True),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_feature("whatsapp")),
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

    # Sempre buscar do banco local e mesclar para garantir que templates locais/sincronizados apareçam
    cached_list = []
    try:
        cached_templates = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id
        ).all()
        for ct in cached_templates:
            cached_list.append({
                "id": str(ct.id),
                "name": ct.name,
                "language": ct.language,
                "category": ct.category or "MARKETING",
                "status": "APPROVED",
                "body_text": ct.body,
                "components": ct.components or [],
                "is_archived": ct.is_archived
            })
    except Exception as db_err:
        logger.error(f"Error querying local template cache: {db_err}")

    if meta_success and templates:
        # Mesclar mantendo os da Meta como prioridade
        meta_names = {t["name"] for t in templates}
        for ct in cached_list:
            if ct["name"] not in meta_names:
                templates.append(ct)
    else:
        templates = cached_list

    # Mapear status is_archived do banco local para os templates vindos da Meta
    try:
        archived_templates = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id,
            models.WhatsAppTemplateCache.is_archived == True
        ).all()
        archived_ids = {str(t.id) for t in archived_templates}
        
        for t in templates:
            t["is_archived"] = str(t.get("id")) in archived_ids
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

    # Mesclar as tags locais, is_pinned e created_at
    try:
        local_caches = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id
        ).all()
        
        # Filtro inteligente para exibir apenas templates associados ao cliente ativo (se houver cache cadastrado)
        # nas telas de uso de templates (onde include_archived é False)
        if not include_archived and local_caches:
            local_cache_names = {lc.name for lc in local_caches}
            templates = [t for t in templates if t.get("name") in local_cache_names]
        
        tags_map = {}
        pinned_map = {}
        created_at_map = {}
        for lc in local_caches:
            if lc.tags:
                tags_map[str(lc.id)] = [t.strip() for t in lc.tags.split(",") if t.strip()]
            else:
                tags_map[str(lc.id)] = []
            pinned_map[str(lc.id)] = lc.is_pinned
            # Salvar created_at no formato ISO string UTC
            created_at_map[str(lc.id)] = lc.created_at.isoformat() if lc.created_at else None
 
        for t in templates:
            t_id = str(t.get("id"))
            t["tags"] = tags_map.get(t_id, [])
            t["is_pinned"] = pinned_map.get(t_id, False)
            t["created_at"] = created_at_map.get(t_id, None)
    except Exception as merge_err:
        logger.error(f"Error merging template tags, pins and created_at: {merge_err}")
        for t in templates:
            if "tags" not in t:
                t["tags"] = []
            if "is_pinned" not in t:
                t["is_pinned"] = False
            if "created_at" not in t:
                t["created_at"] = None
 
    # Ordenar templates: Pinned primeiro, depois por created_at decrescente (mais novos primeiro) e fallback para nome
    templates.sort(key=lambda t: (
        not t.get("is_pinned", False),
        t.get("created_at") is None,
        t.get("created_at", "") * -1 if isinstance(t.get("created_at"), int) else (t.get("created_at") or ""),
        t.get("name", "").lower()
    ), reverse=True)
    
    # Mas queremos: Pinned primeiro (not is_pinned deve ser falso -> not False = True, not True = False, então False vem primeiro se ordenado ascendente)
    # Vamos ordenar explicitamente com uma chave personalizada para decrescente no created_at e ascendente no is_pinned/name:
    # reverse=True inverte tudo, então vamos fazer a chave de forma que maior valor = prioridade
    # is_pinned (True=1, False=0), created_at (string iso, ex: '2026-06-02T...'), name (inverter string ou ordenar de forma que nome alfabético funcione).
    # Uma forma limpa é usar uma função de chave sem reverse=True:
    # key=lambda t: (0 if t.get("is_pinned", False) else 1, -(datetime.fromisoformat(t.get("created_at")).timestamp()) if t.get("created_at") else 0, t.get("name", "").lower())
    # Vamos fazer exatamente isso de forma segura:
    def get_sort_key(t):
        is_pinned_val = 0 if t.get("is_pinned", False) else 1
        created_val = 0
        if t.get("created_at"):
            try:
                # Remove o offset Z se houver, ou trata como timezone-aware
                clean_dt = t.get("created_at").replace("Z", "+00:00")
                created_val = -datetime.fromisoformat(clean_dt).timestamp()
            except Exception:
                created_val = 0
        return (is_pinned_val, created_val, t.get("name", "").lower())

    templates.sort(key=get_sort_key)
    return templates

@router.post("/templates/{template_name}/archive")
async def archive_template(
    template_name: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    logger.info(f"📥 [ARCHIVE_TEMPLATE] Request to archive '{template_name}'. Header Client ID: {x_client_id}, User Client ID: {current_user.client_id}, Target Client ID: {target_client_id}")
    
    db_tpls = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).all()
    if not db_tpls:
        try:
            client = ChatwootClient(client_id=target_client_id)
            meta_tpls = await client.get_whatsapp_templates()
            db_tpls = db.query(models.WhatsAppTemplateCache).filter(
                models.WhatsAppTemplateCache.name == template_name,
                models.WhatsAppTemplateCache.client_id == target_client_id
            ).all()
        except Exception as e:
            logger.error(f"Error fetching templates from Meta to archive: {e}")
            
    if not db_tpls:
        raise HTTPException(status_code=404, detail="Template não encontrado no cache local.")
    
    for db_tpl in db_tpls:
        if db_tpl.is_pinned:
            raise HTTPException(status_code=400, detail="Não é possível arquivar um template que está fixado no topo.")
            
    # Verificar se o template está sendo utilizado em alguma integração de Webhook do mesmo cliente
    has_webhook = db.query(models.WebhookEventMapping).join(
        models.WebhookIntegration,
        models.WebhookEventMapping.integration_id == models.WebhookIntegration.id
    ).filter(
        models.WebhookIntegration.client_id == target_client_id,
        (models.WebhookEventMapping.template_name == template_name) | 
        (models.WebhookEventMapping.followup_template_name == template_name)
    ).first()
    
    logger.info(f"🔍 [ARCHIVE_TEMPLATE] Webhook integration check for '{template_name}': {has_webhook.id if has_webhook else 'NOT FOUND'}")
    
    if has_webhook:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível arquivar este template pois ele está sendo utilizado em uma ou mais integrações de webhook."
        )

    # Verificar se o template está sendo utilizado em algum agendamento recorrente do mesmo cliente
    has_recurring = db.query(models.RecurringTrigger).filter(
        models.RecurringTrigger.client_id == target_client_id,
        models.RecurringTrigger.template_name == template_name
    ).first()
    
    logger.info(f"🔍 [ARCHIVE_TEMPLATE] Recurring trigger check for '{template_name}': {has_recurring.id if has_recurring else 'NOT FOUND'}")
    
    if has_recurring:
        raise HTTPException(
            status_code=400,
            detail="Não é possível arquivar este template pois ele está sendo utilizado em um disparo recorrente ativo."
        )
    
    for db_tpl in db_tpls:
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
    db_tpls = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).all()
    if not db_tpls:
        raise HTTPException(status_code=404, detail="Template não encontrado no cache local.")
    
    for db_tpl in db_tpls:
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

@router.patch("/templates/{template_id}/pin")
async def pin_template(
    template_id: str,
    payload: dict,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    
    try:
        int_id = int(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de template inválido. Deve ser numérico.")

    db_tpl = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.id == int_id,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).first()
    
    if not db_tpl:
        raise HTTPException(
            status_code=404, 
            detail="Template não encontrado no cache local. Atualize a lista de templates primeiro."
        )

    is_pinned = payload.get("is_pinned", False)
    if is_pinned:
        pinned_count = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == target_client_id,
            models.WhatsAppTemplateCache.is_pinned == True,
            models.WhatsAppTemplateCache.is_archived == False,
            models.WhatsAppTemplateCache.id != int_id
        ).count()
        if pinned_count >= 3:
            raise HTTPException(status_code=400, detail="Você só pode fixar até 3 templates no topo!")

    db_tpl.is_pinned = is_pinned
    db.commit()
    db.refresh(db_tpl)
    return {
        "success": True,
        "template_id": template_id,
        "is_pinned": is_pinned
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
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    try:
        target_client_id = x_client_id if x_client_id else current_user.client_id
        labels = (
            db.query(models.ChatLabel)
            .filter(models.ChatLabel.client_id == target_client_id)
            .order_by(models.ChatLabel.name)
            .all()
        )
        return [{"id": l.id, "title": l.name, "color": l.color} for l in labels]
    except Exception as e:
        logger.error(f"Error listing labels: {e}")
        return []

@router.post("/upload-template-media", summary="Upload de mídia para cabeçalho de template")
async def upload_template_media(
    file: UploadFile = File(...),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_premium)
):
    """
    Faz upload de imagem/vídeo/documento para a Meta Resumable Upload API
    e retorna o header_handle a ser usado na criação de templates.
    
    Para vídeos, realiza transcodificação automática para H.264 + AAC + FastStart
    antes do upload, garantindo compatibilidade no WhatsApp mobile (Android/iPhone).
    """
    import os
    import tempfile
    import subprocess

    client_id = x_client_id if x_client_id else current_user.client_id
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    if not wa_token:
        raise HTTPException(status_code=400, detail="WA_ACCESS_TOKEN não configurado.")

    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    is_video = mime_type.startswith("video/") or (file.filename or "").lower().endswith((".mp4", ".mov", ".avi", ".mkv", ".webm"))

    # Transcodificação automática para vídeos: H.264 + AAC + FastStart
    # Isso garante que o vídeo abra corretamente no WhatsApp mobile (Android/iPhone).
    # Sem isso, vídeos com codec H.265/HEVC, AV1 ou sem faststart causam erro no celular.
    if is_video:
        input_tmp = None
        output_tmp = None
        try:
            # Salvar arquivo original em temp
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as f_in:
                f_in.write(file_bytes)
                input_tmp = f_in.name

            output_tmp = input_tmp.replace(".mp4", "_wpp.mp4")

            logger.info(f"🎬 [Template Upload] Transcodificando vídeo para H.264+AAC+FastStart: {file.filename}")

            ffmpeg_result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", input_tmp,
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "fast",
                    "-crf", "23",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    "-movflags", "+faststart",
                    output_tmp
                ],
                capture_output=True,
                text=True,
                timeout=300
            )

            if ffmpeg_result.returncode != 0:
                logger.error(f"❌ [Template Upload] FFmpeg falhou: {ffmpeg_result.stderr}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao processar o vídeo para compatibilidade com WhatsApp: {ffmpeg_result.stderr[-300:]}"
                )

            with open(output_tmp, "rb") as f_out:
                file_bytes = f_out.read()

            mime_type = "video/mp4"
            logger.info(f"✅ [Template Upload] Vídeo transcodificado com sucesso. Tamanho final: {len(file_bytes) / (1024*1024):.1f} MB")

        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=400, detail="Timeout ao processar o vídeo. Tente um arquivo menor.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ [Template Upload] Erro inesperado na transcodificação: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao processar vídeo: {str(e)}")
        finally:
            if input_tmp and os.path.exists(input_tmp):
                try: os.remove(input_tmp)
                except: pass
            if output_tmp and os.path.exists(output_tmp):
                try: os.remove(output_tmp)
                except: pass

    file_length = len(file_bytes)

    async with httpx.AsyncClient(timeout=120.0) as http:
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
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db)
):
    target_client_id = x_client_id if x_client_id else current_user.client_id
    
    # Verificar se o template está fixado no topo
    db_tpl = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).first()
    if db_tpl and db_tpl.is_pinned:
        raise HTTPException(status_code=400, detail="Não é possível excluir um template que está fixado no topo.")
        
    client = ChatwootClient(client_id=target_client_id)
    result = await client.delete_whatsapp_template(template_name)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.delete("/templates/{template_name}/24h-history")
async def reset_template_24h_history(
    template_name: str,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Limpa todo o histórico de disparo de 24h para um template específico (ContactTemplateHistory e MessageStatus sem trigger_id).
    Útil para liberar o re-disparo do template sem precisar aguardar 24h.
    """
    target_client_id = x_client_id if x_client_id else current_user.client_id
    
    # 1. Deletar registros de ContactTemplateHistory para esse template e cliente
    deleted_history = db.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.client_id == target_client_id,
        models.ContactTemplateHistory.template_name == template_name
    ).delete(synchronize_session=False)

    # 2. Deletar registros de MessageStatus de template avulso (sem trigger_id) para esse template
    deleted_ms = db.query(models.MessageStatus).filter(
        models.MessageStatus.template_name == template_name,
        models.MessageStatus.trigger_id.is_(None)
    ).delete(synchronize_session=False)

    db.commit()

    logger.info(f"🧹 [RESET_24H_TEMPLATE] Template '{template_name}' limpo por Client {target_client_id}. Removeu {deleted_history} históricos e {deleted_ms} status.")

    return {
        "status": "success",
        "message": f"Histórico de 24h do template '{template_name}' zerado com sucesso.",
        "details": {
            "deleted_history": deleted_history,
            "deleted_message_status": deleted_ms
        }
    }


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
            raise HTTPException(status_code=400, detail="Phone number and template name are required")

        target_client_id = x_client_id if x_client_id else current_user.client_id
        client = ChatwootClient(client_id=target_client_id)
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
                from database import SessionLocal
                from datetime import datetime, timezone
                from sqlalchemy import cast, Date
                
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

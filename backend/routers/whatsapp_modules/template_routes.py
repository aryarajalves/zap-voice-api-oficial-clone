from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

import models
import schemas
from core.deps import get_db, get_validated_client_id
from core.permissions import require_premium, require_feature, require_user
from core.logger import setup_logger
from .client_helper import get_chatwoot_client, resolve_client_id

logger = setup_logger(__name__)

router = APIRouter()


@router.get("/templates")
async def list_templates(
    include_archived: bool = Query(False),
    include_paused: bool = Query(True),
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_feature("whatsapp")),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    templates = []
    meta_success = False

    try:
        client = get_chatwoot_client(client_id=target_client_id)
        templates = await client.get_whatsapp_templates()
        meta_success = True
    except Exception as e:
        logger.error(f"Error listing templates from Meta (falling back to cache): {e}")

    # Sempre buscar do banco local e mesclar para garantir que templates locais/sincronizados aparecam
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
        # nas telas de uso de templates (onde include_archived e False)
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
 
    def get_sort_key(t):
        is_pinned_val = 0 if t.get("is_pinned", False) else 1
        created_val = 0
        if t.get("created_at"):
            try:
                clean_dt = str(t.get("created_at")).replace("Z", "+00:00")
                created_val = -datetime.fromisoformat(clean_dt).timestamp()
            except Exception:
                created_val = 0
        name_val = str(t.get("name") or "").lower()
        return (is_pinned_val, created_val, name_val)

    templates.sort(key=get_sort_key)
    return templates


@router.post("/templates/{template_name}/archive")
async def archive_template(
    template_name: str,
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    logger.info(f"📥 [ARCHIVE_TEMPLATE] Request to archive '{template_name}'. Client ID: {target_client_id}")
    
    db_tpls = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).all()
    if not db_tpls:
        try:
            client = get_chatwoot_client(client_id=target_client_id)
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
            
    # Verificar se o template esta sendo utilizado em alguma integracao de Webhook do mesmo cliente
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

    # Verificar se o template esta sendo utilizado em algum agendamento recorrente do mesmo cliente
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
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
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
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    
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
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    
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
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
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


@router.post("/templates")
async def create_template(
    payload: schemas.WhatsAppTemplateCreate,
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    client = get_chatwoot_client(client_id=target_client_id)
    payload_data = payload.dict() if hasattr(payload, 'dict') else payload.model_dump()
    result = await client.create_whatsapp_template(payload_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    payload: schemas.WhatsAppTemplateCreate,
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    client = get_chatwoot_client(client_id=target_client_id)
    payload_data = payload.dict() if hasattr(payload, 'dict') else payload.model_dump()
    result = await client.edit_whatsapp_template(template_id, payload_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result


@router.delete("/templates/{template_name}")
async def delete_template(
    template_name: str,
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    
    db_tpl = db.query(models.WhatsAppTemplateCache).filter(
        models.WhatsAppTemplateCache.name == template_name,
        models.WhatsAppTemplateCache.client_id == target_client_id
    ).first()
    if db_tpl and db_tpl.is_pinned:
        raise HTTPException(status_code=400, detail="Não é possível excluir um template que está fixado no topo.")
        
    client = get_chatwoot_client(client_id=target_client_id)
    result = await client.delete_whatsapp_template(template_name)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result


@router.delete("/templates/{template_name}/24h-history")
async def reset_template_24h_history(
    template_name: str,
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
    x_client_id: Optional[int] = None
):
    """
    Limpa todo o historico de disparo de 24h para um template especifico (ContactTemplateHistory e MessageStatus sem trigger_id).
    Util para liberar o re-disparo do template sem precisar aguardar 24h.
    """
    target_client_id = resolve_client_id(client_id, x_client_id)
    
    deleted_history = db.query(models.ContactTemplateHistory).filter(
        models.ContactTemplateHistory.client_id == target_client_id,
        models.ContactTemplateHistory.template_name == template_name
    ).delete(synchronize_session=False)

    deleted_ms = db.query(models.MessageStatus).filter(
        models.MessageStatus.template_name == template_name,
        models.MessageStatus.trigger_id.is_(None)
    ).delete(synchronize_session=False)

    db.commit()

    logger.info(f"🧹 [RESET_24H_TEMPLATE] Template '{template_name}' limpo por Client {target_client_id}. Removeu {deleted_history} historicos e {deleted_ms} status.")

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
    client_id: Optional[int] = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_premium),
    x_client_id: Optional[int] = None
):
    target_client_id = resolve_client_id(client_id, x_client_id)
    client = get_chatwoot_client(client_id=target_client_id)
    result = await client.update_template_status(template_id, status)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

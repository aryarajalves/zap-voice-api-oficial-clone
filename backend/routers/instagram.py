from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import models
import httpx
import random
import os
from core.deps import get_current_user, get_db
from core.permissions import require_premium, require_feature
from core.logger import setup_logger

logger = setup_logger("InstagramRouter")

router = APIRouter(prefix="/instagram", tags=["Instagram Automation"])

# --- Pydantic Schemas ---
class InstagramAutomationBase(BaseModel):
    name: str
    post_id: str = "all"
    trigger_type: str = "keyword"  # "keyword" or "any_comment"
    keywords: Optional[str] = None
    action_type: str = "both"  # "reply_comment", "send_dm", "both"
    reply_comments: List[str] = []
    funnel_id: Optional[int] = None
    is_active: bool = True

class InstagramAutomationCreate(InstagramAutomationBase):
    pass

class InstagramAutomationResponse(InstagramAutomationBase):
    id: int
    client_id: int
    
    class Config:
        from_attributes = True

class InstagramLogResponse(BaseModel):
    id: int
    client_id: int
    instagram_username: Optional[str] = None
    instagram_user_id: Optional[str] = None
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    comment_text: Optional[str] = None
    status: str
    actions_taken: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

# --- API Endpoints ---

@router.get("/logs")
def list_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("settings"))
):
    client_id = x_client_id if x_client_id else current_user.client_id
    query = db.query(models.InstagramLog).filter(
        models.InstagramLog.client_id == client_id
    )

    if status:
        query = query.filter(models.InstagramLog.status == status)

    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(models.InstagramLog.created_at.desc()).offset(offset).limit(limit).all()

    # Formatar datas para strings ISO legíveis
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.id,
            "client_id": log.client_id,
            "instagram_username": log.instagram_username,
            "instagram_user_id": log.instagram_user_id,
            "post_id": log.post_id,
            "comment_id": log.comment_id,
            "comment_text": log.comment_text,
            "status": log.status,
            "actions_taken": log.actions_taken,
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })

    return {
        "logs": formatted_logs,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit)
    }

@router.get("/automations", response_model=List[InstagramAutomationResponse])
def list_automations(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("settings"))
):
    client_id = x_client_id if x_client_id else current_user.client_id
    automations = db.query(models.InstagramAutomation).filter(
        models.InstagramAutomation.client_id == client_id
    ).all()
    return automations

@router.get("/posts")
def get_instagram_posts(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_feature("settings"))
):
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Obter credenciais
    account_id_cfg = db.query(models.AppConfig).filter(
        models.AppConfig.client_id == client_id,
        models.AppConfig.key == "INSTAGRAM_ACCOUNT_ID"
    ).first()
    
    token_cfg = db.query(models.AppConfig).filter(
        models.AppConfig.client_id == client_id,
        models.AppConfig.key == "INSTAGRAM_ACCESS_TOKEN"
    ).first()
    
    if not account_id_cfg or not account_id_cfg.value:
        raise HTTPException(status_code=400, detail="ID da conta do Instagram não configurado. Vá em Configurações para conectar.")
        
    if not token_cfg or not token_cfg.value:
        raise HTTPException(status_code=400, detail="Token de acesso do Instagram não configurado. Vá em Configurações para conectar.")
        
    instagram_account_id = account_id_cfg.value
    access_token = token_cfg.value
    
    try:
        url = f"https://graph.facebook.com/v25.0/{instagram_account_id}/media"
        params = {
            "fields": "id,caption,media_url,permalink,timestamp,media_type",
            "access_token": access_token,
            "limit": 50
        }
        with httpx.Client() as client:
            response = client.get(url, params=params)
            if response.status_code != 200:
                logger.error(f"Erro da Meta API ao listar posts: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Erro da Meta API: {response.json().get('error', {}).get('message', 'Erro desconhecido')}")
            
            data = response.json()
            return data.get("data", [])
    except httpx.RequestError as exc:
        logger.error(f"Falha de rede ao se conectar à API do Instagram: {exc}")
        raise HTTPException(status_code=500, detail="Falha de rede ao se conectar à API do Instagram.")


@router.post("/automations", response_model=InstagramAutomationResponse)
def create_automation(
    automation_in: InstagramAutomationCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    
    # Validações básicas
    if automation_in.trigger_type == "keyword" and not automation_in.keywords:
        raise HTTPException(status_code=400, detail="Palavras-chave são obrigatórias quando o tipo de gatilho for 'keyword'.")
        
    if automation_in.action_type in ("reply_comment", "both") and not automation_in.reply_comments:
        raise HTTPException(status_code=400, detail="Pelo menos uma resposta de comentário é obrigatória.")

    db_automation = models.InstagramAutomation(
        client_id=client_id,
        name=automation_in.name,
        post_id=automation_in.post_id,
        trigger_type=automation_in.trigger_type,
        keywords=automation_in.keywords,
        action_type=automation_in.action_type,
        reply_comments=automation_in.reply_comments,
        funnel_id=automation_in.funnel_id,
        is_active=automation_in.is_active
    )
    
    db.add(db_automation)
    db.commit()
    db.refresh(db_automation)
    return db_automation

@router.put("/automations/{automation_id}", response_model=InstagramAutomationResponse)
def update_automation(
    automation_id: int,
    automation_in: InstagramAutomationCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    db_automation = db.query(models.InstagramAutomation).filter(
        models.InstagramAutomation.id == automation_id,
        models.InstagramAutomation.client_id == client_id
    ).first()

    if not db_automation:
        raise HTTPException(status_code=404, detail="Automação não encontrada")

    for field, value in automation_in.dict().items():
        setattr(db_automation, field, value)

    db.commit()
    db.refresh(db_automation)
    return db_automation

@router.delete("/automations/{automation_id}")
def delete_automation(
    automation_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_premium)
):
    client_id = x_client_id if x_client_id else current_user.client_id
    db_automation = db.query(models.InstagramAutomation).filter(
        models.InstagramAutomation.id == automation_id,
        models.InstagramAutomation.client_id == client_id
    ).first()

    if not db_automation:
        raise HTTPException(status_code=404, detail="Automação não encontrada")

    db.delete(db_automation)
    db.commit()
    return {"status": "success", "message": "Automação deletada com sucesso."}


# --- Webhook do Meta para Instagram ---

@router.get("/webhook")
@router.get("/webhook/{slug}")
def verify_instagram_webhook(
    slug: Optional[str] = None,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    db: Session = Depends(get_db)
):
    """
    Endpoint público para a Meta verificar a conectividade do webhook do Instagram.
    """
    # Se houver um slug, podemos buscar o verify token específico do cliente
    verify_token = None
    if slug:
        cfg = db.query(models.AppConfig).filter(
            models.AppConfig.key == "INSTAGRAM_WEBHOOK_SLUG",
            models.AppConfig.value == slug
        ).first()
        if cfg:
            # Encontrou o cliente. Agora busca o token de verificação ou usa o token padrão
            client_id = cfg.client_id
            token_cfg = db.query(models.AppConfig).filter(
                models.AppConfig.client_id == client_id,
                models.AppConfig.key == "WHATSAPP_VERIFY_TOKEN"  # Podemos usar o token geral ou o padrão
            ).first()
            if token_cfg:
                verify_token = token_cfg.value
    
    if not verify_token:
        verify_token = os.getenv("INSTAGRAM_VERIFY_TOKEN", "zapvoice_instagram_token")

    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        logger.info(f"✅ Webhook do Instagram verificado com sucesso pelo Meta. Slug: {slug}")
        from fastapi.responses import Response
        return Response(content=hub_challenge, media_type="text/plain")
    else:
        logger.warning(f"❌ Falha na verificação do webhook do Instagram. Token incorreto para o slug: {slug}")
        raise HTTPException(status_code=403, detail="Token de verificação inválido")


async def process_instagram_webhook_event(payload: dict, db: Session, slug: Optional[str] = None):
    """
    Processa assincronamente em background os eventos recebidos no webhook do Instagram.
    """
    try:
        if payload.get("object") != "instagram":
            return

        for entry in payload.get("entry", []):
            instagram_account_id = entry.get("id")
            if not instagram_account_id:
                continue

            # Multi-tenancy lookup: Encontrar a qual cliente pertence essa conta do Instagram
            # Se tivermos o slug, filtramos pelo cliente correspondente para garantir isolamento
            client_id = None
            if slug:
                slug_cfg = db.query(models.AppConfig).filter(
                    models.AppConfig.key == "INSTAGRAM_WEBHOOK_SLUG",
                    models.AppConfig.value == slug
                ).first()
                if slug_cfg:
                    client_id = slug_cfg.client_id

            if client_id:
                # Se veio por slug, validamos se o INSTAGRAM_ACCOUNT_ID bate com o configurado para esse cliente
                config_item = db.query(models.AppConfig).filter(
                    models.AppConfig.client_id == client_id,
                    models.AppConfig.key == "INSTAGRAM_ACCOUNT_ID",
                    models.AppConfig.value == str(instagram_account_id)
                ).first()
            else:
                # Fallback legado por ID global
                config_item = db.query(models.AppConfig).filter(
                    models.AppConfig.key == "INSTAGRAM_ACCOUNT_ID",
                    models.AppConfig.value == str(instagram_account_id)
                ).first()

            if not config_item:
                logger.warning(f"⚠️ Conta do Instagram {instagram_account_id} não configurada para o cliente (Slug: {slug}).")
                continue

            client_id = config_item.client_id
            
            # Buscar Token de Acesso do Instagram
            token_config = db.query(models.AppConfig).filter(
                models.AppConfig.client_id == client_id,
                models.AppConfig.key == "INSTAGRAM_ACCESS_TOKEN"
            ).first()

            if not token_config or not token_config.value:
                logger.error(f"❌ Token de acesso do Instagram ausente para o cliente ID {client_id}.")
                continue

            access_token = token_config.value

            # Buscar automações ativas desse cliente
            automations = db.query(models.InstagramAutomation).filter(
                models.InstagramAutomation.client_id == client_id,
                models.InstagramAutomation.is_active == True
            ).all()

            if not automations:
                continue

            for change in entry.get("changes", []):
                if change.get("field") != "comments":
                    continue

                value = change.get("value", {})
                comment_id = value.get("id")
                comment_text = value.get("text", "")
                from_user = value.get("from", {})
                from_user_id = from_user.get("id")
                from_user_username = from_user.get("username")
                post_id = value.get("post", {}).get("id")

                # Ignorar comentários da própria página
                if str(from_user_id) == str(instagram_account_id):
                    continue

                logger.info(f"💬 Comentário recebido de @{from_user_username}: '{comment_text}' no Post {post_id}")

                # Tentar dar match com as automações
                matched_aut = None
                for aut in automations:
                    # Verifica post_id
                    if aut.post_id != "all":
                        allowed_post_ids = [pid.strip() for pid in aut.post_id.split(",") if pid.strip()]
                        if str(post_id) not in allowed_post_ids:
                            continue

                    # Verifica palavra-chave
                    is_match = False
                    if aut.trigger_type == "any_comment":
                        is_match = True
                    elif aut.trigger_type == "keyword" and aut.keywords:
                        kws = [k.strip().lower() for k in aut.keywords.split(",") if k.strip()]
                        # Verifica se alguma palavra-chave está contida no comentário
                        if any(kw in comment_text.lower() for kw in kws):
                            is_match = True

                    if is_match:
                        matched_aut = aut
                        break

                if matched_aut:
                    logger.info(f"🎯 Automação '{matched_aut.name}' ativada para @{from_user_username}")
                    actions_desc, err_msg = await execute_actions(matched_aut, comment_id, from_user_id, access_token, db)
                    
                    # Criar Log com Match
                    log_entry = models.InstagramLog(
                        client_id=client_id,
                        instagram_username=from_user_username,
                        instagram_user_id=str(from_user_id),
                        post_id=str(post_id),
                        comment_id=comment_id,
                        comment_text=comment_text,
                        status="error" if err_msg else "success",
                        actions_taken=actions_desc,
                        error_message=err_msg
                    )
                    db.add(log_entry)
                    db.commit()
                else:
                    # Criar Log sem Match
                    log_entry = models.InstagramLog(
                        client_id=client_id,
                        instagram_username=from_user_username,
                        instagram_user_id=str(from_user_id),
                        post_id=str(post_id),
                        comment_id=comment_id,
                        comment_text=comment_text,
                        status="no_match",
                        actions_taken="Nenhuma regra correspondente"
                    )
                    db.add(log_entry)
                    db.commit()
    except Exception as e:
        logger.error(f"❌ Erro ao processar webhook do Instagram: {e}", exc_info=True)


async def execute_actions(
    automation: models.InstagramAutomation,
    comment_id: str,
    user_id: str,
    access_token: str,
    db: Session
) -> tuple[str, Optional[str]]:
    """
    Executa as ações de responder comentário e enviar Direct Message.
    Retorna uma tupla (ações executadas, mensagem de erro se houver).
    """
    actions_taken = []
    error_msg = None

    # 1. Responder Comentário
    if automation.action_type in ("reply_comment", "both") and automation.reply_comments:
        reply_text = random.choice(automation.reply_comments)
        logger.info(f"↩️ Respondendo comentário {comment_id}: '{reply_text}'")
        try:
            async with httpx.AsyncClient() as client:
                url = f"https://graph.facebook.com/v25.0/{comment_id}/replies"
                response = await client.post(
                    url,
                    params={"access_token": access_token, "message": reply_text}
                )
                if response.status_code == 200:
                    logger.info(f"✅ Resposta de comentário enviada com sucesso.")
                    actions_taken.append(f"Respondeu comentário com '{reply_text}'")
                else:
                    logger.error(f"❌ Erro ao responder comentário: {response.text}")
                    error_msg = f"Erro API Comentário: {response.text}"
        except Exception as e_reply:
            logger.error(f"❌ Falha de rede ao responder comentário: {e_reply}")
            error_msg = f"Falha de rede Comentário: {str(e_reply)}"

    # 2. Enviar Direct Message (DM)
    if automation.action_type in ("send_dm", "both"):
        # Mensagem Padrão de Boas-vindas baseada no Funil ou Mensagem Estática
        dm_text = "Olá! Te enviei as informações no Direct."
        funnel_name = None
        
        # Se um funil estiver associado, tenta pegar o texto do primeiro nó de mensagem dele
        if automation.funnel_id:
            try:
                funnel = db.query(models.Funnel).get(automation.funnel_id)
                if funnel:
                    funnel_name = funnel.name
                    if funnel.steps:
                        # Se for funil legado (lista) ou grafo (dict com nós)
                        first_msg = None
                        if isinstance(funnel.steps, list) and funnel.steps:
                            for step in funnel.steps:
                                if step.get("type") == "message" and step.get("data", {}).get("content"):
                                    first_msg = step["data"]["content"]
                                    break
                        elif isinstance(funnel.steps, dict) and "nodes" in funnel.steps:
                            for node in funnel.steps["nodes"]:
                                if node.get("type") == "message" and node.get("data", {}).get("content"):
                                    first_msg = node["data"]["content"]
                                    break
                        if first_msg:
                            dm_text = first_msg
            except Exception as e_funnel:
                logger.error(f"⚠️ Não foi possível obter o texto do funil {automation.funnel_id}: {e_funnel}")

        logger.info(f"✉️ Enviando Direct Message privada para o comentário {comment_id}: '{dm_text}'")
        try:
            async with httpx.AsyncClient() as client:
                url = "https://graph.facebook.com/v25.0/me/messages"
                payload = {
                    "recipient": {
                        "comment_id": comment_id
                    },
                    "message": {
                        "text": dm_text
                    }
                }
                response = await client.post(
                    url,
                    params={"access_token": access_token},
                    json=payload
                )
                if response.status_code == 200:
                    logger.info(f"✅ Direct Message enviada com sucesso.")
                    if funnel_name:
                        actions_taken.append(f"Iniciou funil '{funnel_name}' via DM")
                    else:
                        actions_taken.append("Enviou mensagem direta (DM)")
                else:
                    logger.error(f"❌ Erro ao enviar DM: {response.text}")
                    if not error_msg:
                        error_msg = f"Erro API DM: {response.text}"
        except Exception as e_dm:
            logger.error(f"❌ Falha de rede ao enviar DM: {e_dm}")
            if not error_msg:
                error_msg = f"Falha de rede DM: {str(e_dm)}"

    actions_desc = " e ".join(actions_taken) if actions_taken else "Ações falharam"
    return actions_desc, error_msg


@router.post("/webhook")
@router.post("/webhook/{slug}")
async def receive_instagram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    slug: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Recebe os payloads de eventos de comentários e os processa assincronamente em background.
    """
    payload = await request.json()
    background_tasks.add_task(process_instagram_webhook_event, payload, db, slug=slug)
    return {"status": "event_received"}

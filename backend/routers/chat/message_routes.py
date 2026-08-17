import os
import sys
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from jose import jwt

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from core.clients.whatsapp.client import WhatsAppClient
from chatwoot_client import ChatwootClient
from services.chat_media_service import upload_media_to_meta_from_url
from core.security import SECRET_KEY, ALGORITHM
from config_loader import get_setting
from .common import get_client_id, ResendAgentFlowPayload, ReactRequest

logger = setup_logger("ChatRouter.Messages")

router = APIRouter()


def _get_whatsapp_client(*args, **kwargs):
    chat_mod = sys.modules.get("routers.chat")
    cls = getattr(chat_mod, "WhatsAppClient", WhatsAppClient) if chat_mod else WhatsAppClient
    return cls(*args, **kwargs)


def _get_chatwoot_client(*args, **kwargs):
    chat_mod = sys.modules.get("routers.chat")
    cls = getattr(chat_mod, "ChatwootClient", ChatwootClient) if chat_mod else ChatwootClient
    return cls(*args, **kwargs)


@router.get("/chat/conversations/{conversation_id}/messages")
@router.get("/v1/accounts/{account_id}/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: int,
    account_id: Optional[int] = None,
    limit: int = Query(50, ge=1),
    before_id: Optional[int] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    convo.unread_count = 0
    db.commit()

    query = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    )

    if before_id is not None:
        query = query.filter(models.ChatMessage.id < before_id)

    messages = query.order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).limit(limit).all()
    messages.reverse()

    result = []
    for m in messages:
        result.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_type": m.sender_type,
            "user_id": m.user_id,
            "message_type": m.message_type,
            "content": m.content,
            "media_url": m.media_url,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "wa_message_id": m.wa_message_id,
            "meta_data": m.meta_data,
            "quoted_message_id": m.quoted_message_id
        })
    return result


@router.get("/chat/conversations/{conversation_id}/media-and-docs", summary="Listar mídias, links e documentos de uma conversa")
async def list_conversation_media(
    conversation_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import re

    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    # Buscar todas as mensagens da conversa ordenadas da mais recente para a mais antiga
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).all()

    media_items = []
    doc_items = []
    link_items = []

    # Regex para capturar links em textos
    url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')

    for m in messages:
        msg_time = m.timestamp.isoformat() if m.timestamp else None
        m_type = m.message_type or "text"

        # 1. Mídias de mensagens diretas
        if m.media_url:
            item_data = {
                "id": m.id,
                "message_id": m.id,
                "type": m_type,
                "url": m.media_url,
                "timestamp": msg_time,
                "caption": m.content,
                "filename": m.meta_data.get("filename") if isinstance(m.meta_data, dict) else None,
                "sender_type": m.sender_type
            }
            if m_type in ["image", "video", "sticker", "audio", "voice"]:
                media_items.append(item_data)
            elif m_type == "document":
                doc_items.append(item_data)
            else:
                media_items.append(item_data)

        # 2. Mídias de templates no header
        elif isinstance(m.meta_data, dict) and m.meta_data.get("header"):
            hdr = m.meta_data.get("header", {})
            hdr_format = hdr.get("format")
            if hdr_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
                hdr_url = hdr.get("media_url") or m.media_url
                if hdr_url:
                    item_data = {
                        "id": m.id,
                        "message_id": m.id,
                        "type": hdr_format.lower(),
                        "url": hdr_url,
                        "timestamp": msg_time,
                        "caption": m.content,
                        "filename": m.meta_data.get("filename"),
                        "sender_type": m.sender_type
                    }
                    if hdr_format == "DOCUMENT":
                        doc_items.append(item_data)
                    else:
                        media_items.append(item_data)

        # 3. Links extraídos do conteúdo
        if m.content:
            found_urls = url_pattern.findall(m.content)
            for raw_url in found_urls:
                full_url = raw_url if raw_url.startswith("http") else f"https://{raw_url}"
                link_items.append({
                    "id": f"{m.id}-{len(link_items)}",
                    "message_id": m.id,
                    "url": full_url,
                    "preview_text": m.content,
                    "timestamp": msg_time,
                    "sender_type": m.sender_type
                })

    return {
        "total_media": len(media_items),
        "total_docs": len(doc_items),
        "total_links": len(link_items),
        "total_all": len(media_items) + len(doc_items) + len(link_items),
        "media": media_items,
        "docs": doc_items,
        "links": link_items
    }


@router.post("/chat/conversations/{conversation_id}/messages")
@router.post("/v1/accounts/{account_id}/conversations/{conversation_id}/messages")
async def send_chat_message(
    conversation_id: int,
    payload: dict,
    account_id: Optional[int] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    content = payload.get("content")
    is_private = payload.get("is_private", False)
    quoted_wa_message_id = payload.get("quoted_wa_message_id")
    if not content:
        raise HTTPException(status_code=400, detail="O conteúdo da mensagem é obrigatório.")

    wa_msg_id = None
    sender_type = "user"

    if is_private:
        sender_type = "system"
    else:
        if convo.last_contact_message_at:
            last_msg_time = convo.last_contact_message_at
            if last_msg_time.tzinfo is None:
                last_msg_time = last_msg_time.replace(tzinfo=timezone.utc)
            
            now_utc = datetime.now(timezone.utc)
            diff = now_utc - last_msg_time
            if diff.total_seconds() > 24 * 3600:
                raise HTTPException(
                    status_code=403, 
                    detail="Janela de 24 horas expirada. A API oficial do WhatsApp só permite enviar mensagens livres caso o cliente tenha interagido nas últimas 24 horas."
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="Nenhuma mensagem recebida deste cliente. A janela de 24 horas precisa ser iniciada por uma mensagem de entrada do cliente."
            )

        wa_client = _get_whatsapp_client(client_id=client_id)
        try:
            response = await wa_client.send_text_official(convo.phone, content, quoted_message_id=quoted_wa_message_id)
            if isinstance(response, dict) and response.get("error"):
                logger.error(f"❌ Erro de envio de WhatsApp: {response}")
                raise HTTPException(status_code=400, detail=response.get("detail") or "Erro ao enviar mensagem pelo WhatsApp.")
        except Exception as e:
            logger.error(f"❌ Falha ao chamar a API do WhatsApp: {e}")
            raise HTTPException(status_code=500, detail=f"Erro de comunicação com o WhatsApp: {str(e)}")

        if isinstance(response, dict) and "messages" in response:
            wa_msg_id = response["messages"][0].get("id")

    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type=sender_type,
        user_id=current_user.id,
        message_type="text",
        content=content,
        wa_message_id=wa_msg_id,
        quoted_message_id=quoted_wa_message_id if not is_private else None
    )
    db.add(new_message)
    db.commit()

    if not is_private:
        try:
            from services.ai_memory import notify_agent_memory_webhook
            import asyncio
            asyncio.create_task(
                notify_agent_memory_webhook(
                    client_id=client_id,
                    phone=convo.phone,
                    name=convo.contact_name,
                    template_name="Mensagem do Atendente",
                    content=content,
                    internal_contact_id=convo.id,
                    dono="atendente"
                )
            )
        except Exception as memory_err:
            logger.error(f"Erro ao disparar webhook de memoria para mensagem de atendente: {memory_err}")

    try:
        from rabbitmq_client import rabbitmq
        payload_ws = {
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_type": new_message.sender_type,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
            "wa_message_id": new_message.wa_message_id,
            "client_id": client_id
        }
        await rabbitmq.publish_event("new_message", payload_ws)
    except Exception as e_ws:
        logger.error(f"Erro no broadcast de mensagem enviada: {e_ws}")

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": new_message.wa_message_id,
        "quoted_message_id": new_message.quoted_message_id
    }


@router.post("/chat/conversations/{conversation_id}/template")
async def send_chat_template(
    conversation_id: int,
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    template_name = payload.get("template_name")
    language = payload.get("language", "pt_BR")
    components = payload.get("components")
    button_actions = payload.get("button_actions")

    window_open = False
    if convo.last_contact_message_at:
        last_msg_time = convo.last_contact_message_at
        if last_msg_time.tzinfo is None:
            last_msg_time = last_msg_time.replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - last_msg_time
        window_open = diff.total_seconds() <= 24 * 3600

    cw = _get_chatwoot_client(client_id=client_id)
    logger.info(f"Sending chat template HSM '{template_name}' to {convo.phone} (window_open={window_open})")
    result = await cw.send_template(convo.phone, template_name, language, components)

    if not result or (isinstance(result, dict) and result.get("error")):
        err_detail = result.get("detail") if result else "Sem resposta do WhatsApp"
        raise HTTPException(status_code=500, detail=f"Erro Meta API: {err_detail}")

    wa_msg_id = None
    if isinstance(result, dict):
        messages = result.get("messages", [])
        if messages:
            wa_msg_id = messages[0].get("id")
            if wa_msg_id:
                wa_msg_id = wa_msg_id.replace("wamid.", "")

    sent_as_text = window_open

    content = f"[Template: {template_name}]"
    header_info = None
    buttons_info = []

    try:
        tpl_cache = db.query(models.WhatsAppTemplateCache).filter(
            models.WhatsAppTemplateCache.client_id == client_id,
            models.WhatsAppTemplateCache.name == template_name
        ).first()
        if tpl_cache:
            if tpl_cache.body:
                content = tpl_cache.body
            if components:
                try:
                    body_params = []
                    for comp in components:
                        if comp.get("type") == "body":
                            for param in comp.get("parameters", []):
                                if param.get("type") == "text":
                                    body_params.append(str(param.get("text")))
                    for idx, val in enumerate(body_params):
                        content = content.replace(f"{{{{{idx+1}}}}}", val)
                except Exception as e_replace:
                    logger.error(f"Erro ao substituir variáveis do template: {e_replace}")
            
            if tpl_cache.components:
                for comp in tpl_cache.components:
                    comp_type = str(comp.get("type", "")).upper()
                    if comp_type == "HEADER":
                        h_format = comp.get("format", "TEXT")
                        h_text = comp.get("text")
                        header_info = {"format": h_format, "text": h_text}
                    elif comp_type == "BUTTONS":
                        for btn in comp.get("buttons", []):
                            btn_text = btn.get("text")
                            if btn_text:
                                buttons_info.append(btn_text)
    except Exception as e_cache:
        logger.error(f"Erro ao buscar cache do template: {e_cache}")

    meta_data = {
        "is_template": True,
        "template_name": template_name,
        "header": header_info,
        "buttons": buttons_info
    }
    if sent_as_text:
        meta_data["is_free_message"] = True

    template_media_url = None
    if components:
        for comp in components:
            if comp.get("type") == "header":
                params = comp.get("parameters", [])
                if params and isinstance(params, list):
                    header_param = params[0]
                    p_type = header_param.get("type")
                    if p_type in ["image", "video", "document"]:
                        media_obj = header_param.get(p_type, {})
                        template_media_url = media_obj.get("link")

    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        user_id=current_user.id,
        message_type="text",
        content=content,
        media_url=template_media_url,
        wa_message_id=wa_msg_id,
        meta_data=meta_data
    )
    db.add(new_message)

    convo.last_message_content = content
    convo.unread_count = 0
    db.commit()
    db.refresh(new_message)

    if button_actions:
        try:
            btn_trigger = models.ScheduledTrigger(
                client_id=client_id,
                funnel_id=None,
                status='sent',
                is_bulk=False,
                contact_phone=convo.phone,
                contact_name=convo.contact_name or '',
                conversation_id=convo.id,
                template_name=template_name,
                button_actions=button_actions,
                contacts_list=[{
                    "id": str(convo.id),
                    "meta": {"sender": {"name": convo.contact_name or '', "phone_number": convo.phone}}
                }],
                scheduled_time=datetime.now(timezone.utc)
            )
            db.add(btn_trigger)
            db.commit()
            logger.info(f"🎯 [CHAT_TEMPLATE] ScheduledTrigger criado (id={btn_trigger.id}) com button_actions para {convo.phone}: {list(button_actions.keys())}")
        except Exception as e_btn:
            logger.error(f"⚠️ [CHAT_TEMPLATE] Falha ao criar ScheduledTrigger para button_actions: {e_btn}")

    try:
        import asyncio
        from services.ai_memory import notify_agent_memory_webhook
        asyncio.create_task(notify_agent_memory_webhook(
            client_id=client_id,
            phone=convo.phone,
            name=convo.contact_name or convo.phone,
            template_name=template_name,
            content=content,
            internal_contact_id=new_message.id,
            dono="agente"
        ))
    except Exception as e_mem:
        logger.error(f"⚠️ [CHAT_TEMPLATE] Falha ao enviar para o webhook de memória: {e_mem}")

    try:
        from rabbitmq_client import rabbitmq
        payload_ws = {
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_type": new_message.sender_type,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
            "wa_message_id": new_message.wa_message_id,
            "meta_data": new_message.meta_data,
            "client_id": client_id
        }
        await rabbitmq.publish_event("new_message", payload_ws)
    except Exception as e_ws:
        logger.error(f"Erro no broadcast de template enviado: {e_ws}")

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": new_message.wa_message_id,
        "meta_data": new_message.meta_data,
        "sent_as_text": sent_as_text
    }


@router.get("/chat/media/{media_id}")
async def proxy_whatsapp_media(
    media_id: str,
    client_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not token:
        raise HTTPException(status_code=401, detail="Token de autenticação não fornecido.")

    is_valid = False
    if token.startswith("zv_live_"):
        import hashlib
        from models.api_key import ApiKey
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        api_key_entry = db.query(ApiKey).filter(
            ApiKey.token_hash == token_hash,
            ApiKey.is_active == True
        ).first()
        if api_key_entry:
            is_valid = True
    else:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                is_valid = True
        except Exception:
            pass

    if not is_valid:
        raise HTTPException(status_code=401, detail="Token ou Chave de API inválida.")
    
    wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=client_id)
    if not wa_token:
        raise HTTPException(status_code=400, detail="WhatsApp Access Token não configurado.")
        
    async with httpx.AsyncClient() as client:
        meta_url = f"https://graph.facebook.com/v25.0/{media_id}"
        headers = {"Authorization": f"Bearer {wa_token}"}
        try:
            res = await client.get(meta_url, headers=headers)
            if res.status_code != 200:
                logger.error(f"❌ Erro na Meta API de mídia ({res.status_code}): {res.text}")
                raise HTTPException(status_code=res.status_code, detail="Erro ao obter metadados da mídia na Meta.")
            data = res.json()
            download_url = data.get("url")
            mime_type = data.get("mime_type", "application/octet-stream")
            
            if not download_url:
                raise HTTPException(status_code=404, detail="URL de download não encontrada.")
                
            media_res = await client.get(download_url, headers=headers)
            if media_res.status_code != 200:
                raise HTTPException(status_code=media_res.status_code, detail="Erro ao baixar mídia da Meta.")
                
            return StreamingResponse(
                content=media_res.iter_bytes(),
                media_type=mime_type
            )
        except Exception as e:
            logger.error(f"Erro no proxy de mídia: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/conversations/{conversation_id}/media")
async def send_chat_media_message(
    conversation_id: int,
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    if convo.last_contact_message_at:
        last_msg_time = convo.last_contact_message_at
        if last_msg_time.tzinfo is None:
            last_msg_time = last_msg_time.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        diff = now_utc - last_msg_time
        if diff.total_seconds() > 24 * 3600:
            raise HTTPException(
                status_code=403,
                detail="Janela de 24 horas expirada. A API oficial do WhatsApp só permite enviar mensagens livres caso o cliente tenha interagido nas últimas 24 horas."
            )
    else:
        raise HTTPException(
            status_code=403,
            detail="Nenhuma mensagem recebida deste cliente. A janela de 24 horas precisa ser iniciada por uma mensagem de entrada do cliente."
        )

    media_url = payload.get("media_url")
    m_type = payload.get("message_type")
    caption = payload.get("caption", "")
    quoted_wa_message_id = payload.get("quoted_wa_message_id")
    if not media_url or not m_type:
        raise HTTPException(status_code=400, detail="Mídia URL e Tipo de Mensagem são obrigatórios.")

    wa_client = _get_whatsapp_client(client_id=client_id)

    meta_media_id = None
    if m_type in ["image", "video", "document"]:
        meta_media_id = await upload_media_to_meta_from_url(wa_client, media_url, m_type)
        if meta_media_id is None:
            LIMIT_LABELS = {"image": "5 MB", "video": "16 MB", "document": "100 MB"}
            limit_label = LIMIT_LABELS.get(m_type, "16 MB")
            logger.error(f"❌ [CHAT_MEDIA] Falha no upload para Meta (arquivo muito grande ou erro de API) | tipo: {m_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Não foi possível enviar a mídia. O arquivo pode ser muito grande para o WhatsApp (limite: {limit_label}) ou houve um erro na API da Meta."
            )

    try:
        if m_type == "image":
            if meta_media_id:
                json_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": ''.join(filter(str.isdigit, convo.phone)),
                    "type": "image",
                    "image": {"id": meta_media_id, "caption": caption}
                }
                if quoted_wa_message_id:
                    json_payload["context"] = {"message_id": quoted_wa_message_id}
                response = await wa_client._meta_request("POST", "messages", json=json_payload)
            else:
                response = await wa_client.send_image_official(convo.phone, media_url, caption=caption)
        elif m_type == "video":
            if meta_media_id:
                json_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": ''.join(filter(str.isdigit, convo.phone)),
                    "type": "video",
                    "video": {"id": meta_media_id, "caption": caption}
                }
                if quoted_wa_message_id:
                    json_payload["context"] = {"message_id": quoted_wa_message_id}
                response = await wa_client._meta_request("POST", "messages", json=json_payload)
            else:
                response = await wa_client.send_video_official(convo.phone, media_url, caption=caption)
        elif m_type in ["audio", "voice"]:
            response = await wa_client.send_audio_official(convo.phone, media_url)
        elif m_type == "document":
            if meta_media_id:
                json_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": ''.join(filter(str.isdigit, convo.phone)),
                    "type": "document",
                    "document": {"id": meta_media_id, "caption": caption, "filename": "documento"}
                }
                if quoted_wa_message_id:
                    json_payload["context"] = {"message_id": quoted_wa_message_id}
                response = await wa_client._meta_request("POST", "messages", json=json_payload)
            else:
                response = await wa_client.send_document_official(convo.phone, media_url, caption=caption)
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de mídia não suportado: {m_type}")

        if isinstance(response, dict) and response.get("error"):
            logger.error(f"❌ Erro de envio de WhatsApp: {response}")
            raise HTTPException(status_code=400, detail=response.get("detail") or "Erro ao enviar mídia pelo WhatsApp.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Falha ao chamar a API do WhatsApp para mídia: {e}")
        raise HTTPException(status_code=500, detail=f"Erro de comunicação com o WhatsApp: {str(e)}")

    wa_msg_id = None
    if isinstance(response, dict) and "messages" in response:
        wa_msg_id = response["messages"][0].get("id")

    if m_type == "image":
        content_text = f"📷 {caption}" if caption else "📷 Imagem enviada"
    elif m_type == "video":
        content_text = f"🎬 {caption}" if caption else "🎬 Vídeo enviado"
    elif m_type in ["audio", "voice"]:
        content_text = "🎵 Áudio enviado"
    else:
        content_text = "📄 Documento enviado"

    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        user_id=current_user.id,
        message_type=m_type,
        content=content_text,
        media_url=media_url,
        wa_message_id=wa_msg_id,
        quoted_message_id=quoted_wa_message_id
    )
    db.add(new_message)

    convo.last_message_content = content_text
    convo.unread_count = 0
    convo.last_message_at = datetime.now(timezone.utc)
    db.commit()

    try:
        from rabbitmq_client import rabbitmq
        payload_ws = {
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_type": new_message.sender_type,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "media_url": new_message.media_url,
            "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
            "wa_message_id": new_message.wa_message_id,
            "client_id": client_id
        }
        await rabbitmq.publish_event("new_message", payload_ws)
    except Exception as e_ws:
        logger.error(f"Erro no broadcast de mídia enviada: {e_ws}")

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "media_url": new_message.media_url,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": new_message.wa_message_id,
        "quoted_message_id": new_message.quoted_message_id
    }


@router.delete("/chat/conversations/{conversation_id}/messages/{message_id}")
async def delete_chat_message(
    conversation_id: int,
    message_id: int,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convo = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    msg = db.query(models.ChatMessage).filter(
        models.ChatMessage.id == message_id,
        models.ChatMessage.conversation_id == conversation_id
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")

    if msg.sender_type not in ["user", "system"]:
        raise HTTPException(status_code=403, detail="Não é possível deletar esta mensagem.")

    if msg.content and msg.content.startswith("🔒 Anotação Privada:"):
        note_text = msg.content.replace("🔒 Anotação Privada: ", "")
        if convo.private_note == note_text or note_text in convo.private_note:
            convo.private_note = ""

    wa_result = {"skipped": True}
    if msg.wa_message_id and msg.sender_type == "user":
        wa_client = _get_whatsapp_client(client_id=client_id)
        wa_result = await wa_client.delete_message(msg.wa_message_id)

    db.delete(msg)
    db.commit()

    return {"success": True, "wa_result": wa_result, "deleted_id": message_id}


@router.post("/chat/messages/{message_id}/resend-agentflow")
async def resend_message_to_agentflow(
    message_id: int,
    payload_data: Optional[ResendAgentFlowPayload] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from services.chat_webhook_service import dispatch_webhook_in_thread
    from models import ChatMessage, ChatConversation, WebhookLead
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")
        
    convo = db.query(ChatConversation).filter(
        ChatConversation.id == message.conversation_id,
        ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=403, detail="Acesso negado a esta mensagem.")
        
    if message.sender_type != "contact":
        raise HTTPException(status_code=400, detail="Apenas mensagens recebidas de contatos podem ser enviadas ao AgentFlow.")
        
    if payload_data and payload_data.content is not None:
        message.content = payload_data.content
        db.commit()
        
    webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=client_id)
    if not webhook_url or not webhook_url.strip():
        raise HTTPException(status_code=400, detail="Webhook de Mensagens (AgentFlow) não está configurado.")
        
    lead = db.query(WebhookLead).filter(
        WebhookLead.client_id == client_id,
        WebhookLead.phone == convo.phone
    ).first()
    bsud = lead.bsud if lead else None
    
    window_24h_data = None
    if convo.last_contact_message_at:
        last_contact_msg_at = convo.last_contact_message_at
        if last_contact_msg_at.tzinfo is None:
            last_contact_msg_at = last_contact_msg_at.replace(tzinfo=timezone.utc)
            
        expiry = last_contact_msg_at + timedelta(hours=24)
        now = datetime.now(timezone.utc)
        remaining = int((expiry - now).total_seconds())
        if remaining < 0:
            remaining = 0
            
        window_24h_data = {
            "last_contact_message_at": last_contact_msg_at.isoformat(),
            "expiry": expiry.isoformat(),
            "remaining_seconds": remaining
        }
    
    payload = {
        "event": "message.created",
        "client_id": client_id,
        "window_24h": window_24h_data,
        "message": {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_type": message.sender_type,
            "message_type": message.message_type,
            "content": message.content,
            "media_url": message.media_url,
            "timestamp": message.timestamp.isoformat() if message.timestamp else datetime.now(timezone.utc).isoformat(),
            "is_private": getattr(message, 'is_private', False),
            "metadata": {
                **(message.meta_data or {}),
                "window_24h": window_24h_data
            }
        },
        "contact": {
            "phone": convo.phone,
            "name": convo.contact_name or convo.phone,
            "bsud": bsud,
            "labels": convo.labels or [],
            "window_24h": window_24h_data
        }
    }
    
    message.agentflow_webhook_status = "sending"
    message.agentflow_webhook_error = None
    db.commit()
    
    dispatch_webhook_in_thread(webhook_url, payload, message.id)
    
    return {"status": "success", "detail": "Reenvio de webhook iniciado."}


@router.post("/chat/react")
async def react_to_message(
    payload: ReactRequest,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    if not payload.phone or not payload.message_id:
        raise HTTPException(status_code=400, detail="Telefone e message_id são obrigatórios.")

    target_wamid = payload.message_id
    msg_obj = None

    if not target_wamid.startswith("wamid."):
        try:
            msg_id_num = int(payload.message_id)
            msg_obj = db.query(models.ChatMessage).filter(models.ChatMessage.id == msg_id_num).first()
        except (ValueError, TypeError):
            pass
    else:
        msg_obj = db.query(models.ChatMessage).filter(models.ChatMessage.wa_message_id == target_wamid).first()

    if msg_obj:
        target_wamid = getattr(msg_obj, "wa_message_id", None) or target_wamid

    if not target_wamid or not str(target_wamid).startswith("wamid."):
        logger.warning(f"⚠️ [REACT] Mensagem {payload.message_id} não possui wamid válido da Meta (recebido: {target_wamid})")
        raise HTTPException(
            status_code=400,
            detail="Não foi possível reagir: esta mensagem não possui o ID oficial do WhatsApp (wamid)."
        )

    wa_client = _get_whatsapp_client(client_id=client_id)
    try:
        res = await wa_client.send_reaction_official(
            phone_number=payload.phone,
            message_id=target_wamid,
            emoji=payload.emoji
        )
        logger.info(f"👍 [REACT] Reação '{payload.emoji}' enviada para {payload.phone} na mensagem {target_wamid}: {res}")

        if msg_obj:
            meta = dict(msg_obj.meta_data or {})
            raw_reactions = meta.get("reactions") or []
            if isinstance(raw_reactions, dict):
                reactions_list = [{"emoji": v, "sender": k} for k, v in raw_reactions.items() if v]
            elif isinstance(raw_reactions, list):
                reactions_list = [r for r in raw_reactions if isinstance(r, dict) and r.get("emoji")]
            else:
                reactions_list = []
            
            reactions_list = [r for r in reactions_list if r.get("sender") != "agent"]
            if payload.emoji:
                reactions_list.append({"emoji": payload.emoji, "sender": "agent"})
            
            meta["reactions"] = reactions_list
            msg_obj.meta_data = meta
            flag_modified(msg_obj, "meta_data")
            db.commit()

        return {"status": "success", "response": res, "message_id": target_wamid, "emoji": payload.emoji}
    except Exception as e:
        logger.error(f"❌ [REACT] Erro ao enviar reação: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar reação: {str(e)}")

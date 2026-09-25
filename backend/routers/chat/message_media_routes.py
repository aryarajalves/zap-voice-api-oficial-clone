import re
import httpx
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from core.security import SECRET_KEY, ALGORITHM
from config_loader import get_setting
from .common import get_client_id

logger = setup_logger("ChatRouter.Messages.Media")

router = APIRouter()


def _get_wa_client(*args, **kwargs):
    import routers.chat.message_routes as mr
    return mr._get_whatsapp_client(*args, **kwargs)


async def _upload_media(*args, **kwargs):
    import routers.chat.message_routes as mr
    return await mr.upload_media_to_meta_from_url(*args, **kwargs)


@router.get("/chat/conversations/{conversation_id}/media-and-docs", summary="Listar mídias, links e documentos de uma conversa")
async def list_conversation_media(
    conversation_id: int,
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

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).all()

    media_items = []
    doc_items = []
    link_items = []
    note_items = []

    url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')

    for m in messages:
        msg_time = m.timestamp.isoformat() if m.timestamp else None
        m_type = m.message_type or "text"

        if m.sender_type == "system" and m.content and ("Anotação Privada:" in m.content or "Nota:" in m.content):
            clean_text = m.content
            if "🔒 Anotação Privada: " in clean_text:
                clean_text = clean_text.split("🔒 Anotação Privada: ", 1)[1]
            elif "🔒 Anotação Privada:" in clean_text:
                clean_text = clean_text.split("🔒 Anotação Privada:", 1)[1]
            elif "🔒 Nota: " in clean_text:
                clean_text = clean_text.split("🔒 Nota: ", 1)[1]
            elif "Anotação Privada: " in clean_text:
                clean_text = clean_text.split("Anotação Privada: ", 1)[1]

            note_items.append({
                "id": m.id,
                "message_id": m.id,
                "content": clean_text.strip(),
                "raw_content": m.content,
                "timestamp": msg_time,
                "user_id": m.user_id,
                "sender_type": m.sender_type
            })
            continue

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

    user_msgs_count = sum(1 for m in messages if m.sender_type == "contact")
    agent_msgs_count = sum(1 for m in messages if m.sender_type in ["user", "agent"])
    system_msgs_count = sum(1 for m in messages if m.sender_type == "system")

    return {
        "total_media": len(media_items),
        "total_docs": len(doc_items),
        "total_links": len(link_items),
        "total_notes": len(note_items),
        "total_all": len(media_items) + len(doc_items) + len(link_items) + len(note_items),
        "user_messages_count": user_msgs_count,
        "agent_messages_count": agent_msgs_count,
        "system_messages_count": system_msgs_count,
        "total_messages": len(messages),
        "media": media_items,
        "docs": doc_items,
        "links": link_items,
        "notes": note_items
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

    wa_client = _get_wa_client(client_id=client_id)

    meta_media_id = None
    if m_type in ["image", "video", "document"]:
        meta_media_id = await _upload_media(wa_client, media_url, m_type)
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
            "status": "sent",
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
        "status": "sent",
        "quoted_message_id": new_message.quoted_message_id
    }

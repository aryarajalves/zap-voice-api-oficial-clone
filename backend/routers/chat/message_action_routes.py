from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from config_loader import get_setting
from .common import get_client_id, ResendAgentFlowPayload, ReactRequest

logger = setup_logger("ChatRouter.Messages.Actions")

router = APIRouter()


def _get_wa_client(*args, **kwargs):
    import routers.chat.message_routes as mr
    return mr._get_whatsapp_client(*args, **kwargs)


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
        if convo.private_note and (convo.private_note == note_text or note_text in convo.private_note):
            convo.private_note = ""

    wa_result = {"skipped": True}
    if msg.wa_message_id and msg.sender_type == "user":
        wa_client = _get_wa_client(client_id=client_id)
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

    wa_client = _get_wa_client(client_id=client_id)
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

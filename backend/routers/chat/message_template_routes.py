import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from .common import get_client_id

logger = setup_logger("ChatRouter.Messages.Template")

router = APIRouter()


def _get_cw_client(*args, **kwargs):
    import routers.chat.message_routes as mr
    return mr._get_chatwoot_client(*args, **kwargs)


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

    cw = _get_cw_client(client_id=client_id)
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
    convo.last_message_at = datetime.now(timezone.utc)
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

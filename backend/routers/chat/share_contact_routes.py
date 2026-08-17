import logging
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from core.clients.whatsapp.client import WhatsAppClient
from .common import get_client_id

logger = setup_logger("ChatRouter.ShareContact")

router = APIRouter()


class TargetContactItem(BaseModel):
    conversation_id: Optional[int] = None
    phone: Optional[str] = None
    name: Optional[str] = None


class ShareContactPayload(BaseModel):
    target_conversation_ids: Optional[List[int]] = []
    target_contacts: Optional[List[TargetContactItem]] = []
    contact_name: str
    contact_phone: str
    contact_id: Optional[int] = None


@router.post("/chat/conversations/share-contact")
async def share_contact_message(
    payload: ShareContactPayload,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compartilha um contato (vCard) com uma ou mais conversas no WhatsApp Oficial.
    Gera o cartão de contato nativo da Meta e registra a mensagem do tipo 'contact' no chat.
    """
    if not payload.target_conversation_ids and not payload.target_contacts:
        raise HTTPException(status_code=400, detail="Pelo menos um contato ou conversa de destino deve ser selecionado.")

    if not payload.contact_phone:
        raise HTTPException(status_code=400, detail="O telefone do contato a ser compartilhado é obrigatório.")

    wa_client = WhatsAppClient(client_id=client_id)
    created_messages = []
    failed_convos = []

    clean_contact_name = (payload.contact_name or payload.contact_phone).strip()
    clean_contact_phone = payload.contact_phone.strip()

    # Consolidar destinos
    targets_to_process = []

    # 1. Destinos por conversation_id
    for convo_id in (payload.target_conversation_ids or []):
        convo = db.query(models.ChatConversation).filter(
            models.ChatConversation.id == convo_id,
            models.ChatConversation.client_id == client_id
        ).first()
        if convo:
            targets_to_process.append(convo)
        else:
            failed_convos.append({"conversation_id": convo_id, "reason": "Conversa não encontrada."})

    # 2. Destinos por contato avulso
    for tc in (payload.target_contacts or []):
        if tc.conversation_id:
            convo = db.query(models.ChatConversation).filter(
                models.ChatConversation.id == tc.conversation_id,
                models.ChatConversation.client_id == client_id
            ).first()
            if convo and convo not in targets_to_process:
                targets_to_process.append(convo)
        elif tc.phone:
            clean_p = ''.join(filter(str.isdigit, str(tc.phone)))
            if clean_p:
                convo = db.query(models.ChatConversation).filter(
                    models.ChatConversation.client_id == client_id,
                    models.ChatConversation.phone == clean_p
                ).first()
                if not convo:
                    convo = models.ChatConversation(
                        client_id=client_id,
                        phone=clean_p,
                        contact_name=tc.name or clean_p,
                        status="open",
                        last_contact_message_at=datetime.now(timezone.utc)
                    )
                    db.add(convo)
                    db.commit()
                    db.refresh(convo)
                if convo not in targets_to_process:
                    targets_to_process.append(convo)

    for convo in targets_to_process:
        # Validação de janela de 24h
        if convo.last_contact_message_at:
            last_msg_time = convo.last_contact_message_at
            if last_msg_time.tzinfo is None:
                last_msg_time = last_msg_time.replace(tzinfo=timezone.utc)
            now_utc = datetime.now(timezone.utc)
            diff = now_utc - last_msg_time
            if diff.total_seconds() > 24 * 3600:
                failed_convos.append({
                    "conversation_id": convo.id,
                    "phone": convo.phone,
                    "reason": "Janela de 24h expirada para esta conversa."
                })
                continue
        else:
            failed_convos.append({
                "conversation_id": convo.id,
                "phone": convo.phone,
                "reason": "Nenhuma mensagem recebida deste cliente (janela 24h fechada)."
            })
            continue

        wa_msg_id = None
        try:
            res = await wa_client.send_contact_official(
                to_phone=convo.phone,
                contact_name=clean_contact_name,
                contact_phone=clean_contact_phone
            )
            if isinstance(res, dict) and res.get("error"):
                logger.error(f"❌ Erro ao enviar contato via WhatsApp para {convo.phone}: {res}")
                failed_convos.append({"conversation_id": convo_id, "reason": str(res.get("detail") or res.get("error"))})
                continue
            
            if isinstance(res, dict) and "messages" in res and res["messages"]:
                wa_msg_id = res["messages"][0].get("id")
        except Exception as err:
            logger.error(f"❌ Falha de comunicação com Meta ao enviar contato para {convo.phone}: {err}")
            failed_convos.append({"conversation_id": convo_id, "reason": str(err)})
            continue

        content_text = f"👤 {clean_contact_name}\n{clean_contact_phone}"
        meta_data = {
            "contact_name": clean_contact_name,
            "contact_phone": clean_contact_phone,
            "shared_contact_id": payload.contact_id,
            "is_contact_card": True
        }

        new_message = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="user",
            user_id=current_user.id,
            message_type="contact",
            content=content_text,
            wa_message_id=wa_msg_id,
            meta_data=meta_data
        )
        db.add(new_message)

        convo.last_message_content = f"👤 Contato: {clean_contact_name}"
        convo.unread_count = 0
        convo.last_message_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(new_message)

        msg_payload = {
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_type": new_message.sender_type,
            "user_id": new_message.user_id,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
            "wa_message_id": new_message.wa_message_id,
            "meta_data": new_message.meta_data
        }
        created_messages.append(msg_payload)

        try:
            from rabbitmq_client import rabbitmq
            payload_ws = {
                **msg_payload,
                "client_id": client_id
            }
            await rabbitmq.publish_event("new_message", payload_ws)
        except Exception as e_ws:
            logger.error(f"Erro no broadcast de contato compartilhado: {e_ws}")

    if not created_messages and failed_convos:
        reasons = "; ".join([f"Convo #{f['conversation_id']}: {f['reason']}" for f in failed_convos])
        raise HTTPException(status_code=400, detail=f"Falha ao compartilhar contato: {reasons}")

    return {
        "success": True,
        "sent_count": len(created_messages),
        "failed_count": len(failed_convos),
        "messages": created_messages,
        "failed_convos": failed_convos
    }

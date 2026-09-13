import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from core.deps import get_db, get_current_user
from core.logger import setup_logger
from ..common import get_client_id
from .conversation_filter_helpers import (
    build_conversation_filter_query,
    get_blocked_and_resting_data,
    get_block_info,
)

logger = setup_logger("ChatRouter.ConversationDelete")

router = APIRouter()


@router.delete("/chat/conversations/{conversation_id}/messages", summary="Limpar mensagens de uma conversa")
async def clear_conversation_messages(
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

    deleted_count = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).delete(synchronize_session=False)

    convo.last_message_content = None
    convo.unread_count = 0
    db.commit()

    logger.info(f"🧹 [CLEAR_CONVO_MESSAGES] Conversa #{conversation_id} teve {deleted_count} mensagens limpas pelo usuário #{current_user.id}.")
    return {
        "status": "ok",
        "conversation_id": conversation_id,
        "deleted_count": deleted_count,
        "message": "Histórico de mensagens limpo com sucesso."
    }


@router.delete("/chat/conversations/{conversation_id}", summary="Deletar conversa")
async def delete_conversation(
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
    db.delete(convo)
    db.commit()
    return {"status": "ok", "deleted_id": conversation_id}


@router.delete("/chat/conversations", summary="Deletar múltiplas conversas")
async def delete_conversations_bulk(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    select_all_pages = payload.get("select_all_pages", False)
    if select_all_pages:
        query = build_conversation_filter_query(
            db=db,
            client_id=client_id,
            current_user=current_user,
            tab=payload.get("tab", "todos"),
            status=payload.get("status", "open"),
            unread_only=payload.get("unread_only"),
            window_open_only=payload.get("window_open_only"),
            urgent_only=payload.get("urgent_only"),
            has_replied=payload.get("has_replied"),
            has_active_funnel=payload.get("has_active_funnel"),
            start_date=payload.get("start_date"),
            end_date=payload.get("end_date"),
            search=payload.get("search"),
            has_note=payload.get("has_note")
        )

        conversations = query.all()

        label = payload.get("label")
        if label:
            clean_label = label.strip().lower()
            conversations = [
                c for c in conversations
                if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
            ]

        block_status = payload.get("block_status")
        if block_status:
            blocked_suffixes, resting_map = get_blocked_and_resting_data(db, client_id)
            filtered_conversations = []
            for c in conversations:
                block_type, _ = get_block_info(c.phone, blocked_suffixes, resting_map)
                if block_type == block_status:
                    filtered_conversations.append(c)
            conversations = filtered_conversations

        deleted = conversations
    else:
        ids = payload.get("ids", [])
        if not ids:
            raise HTTPException(status_code=400, detail="Nenhum ID fornecido.")
        deleted = db.query(models.ChatConversation).filter(
            models.ChatConversation.id.in_(ids),
            models.ChatConversation.client_id == client_id
        ).all()

    count = len(deleted)
    for convo in deleted:
        db.delete(convo)
    db.commit()
    return {"status": "ok", "deleted_count": count}


@router.post("/chat/seed-conversations")
async def seed_conversations(
    count: int = Query(5000, ge=1, le=10000),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    first_names = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana", "Lucas", "Mariana", "Natan", "Patricia", "Rafael", "Sophia", "Thiago", "Vanessa", "Wagner", "Yasmin"]
    last_names = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"]
    sample_messages = [
        "Olá, gostaria de saber mais informações sobre os cursos de astrologia.",
        "Boa tarde! Como funciona a consulta individual com o Crassos?",
        "Oi! Recebi o convite para o evento de quinta-feira, como faço para confirmar?",
        "Tudo bem? Qual é o valor do mapa astral completo?",
        "Olá! Vocês têm atendimento nos finais de semana?",
        "Oi, preciso de ajuda com o meu acesso à plataforma de membros.",
        "Boa tarde! O evento Astrowake é gratuito mesmo?",
        "Olá, gostaria de agendar uma consulta para a próxima semana.",
        "Oi! Consegue me mandar o link do grupo VIP?",
        "Boa tarde, tentei fazer o pagamento mas deu erro na página."
    ]

    start_phone_base = 558590000000
    now = datetime.now(timezone.utc)

    max_id = db.query(func.max(models.ChatConversation.id)).scalar() or 0
    phone_offset = max_id + random.randint(1000, 9999)

    messages_to_create = []

    for i in range(count):
        fn = first_names[i % len(first_names)]
        ln = last_names[(i // len(first_names)) % len(last_names)]
        name = f"{fn} {ln} #{i+1}"
        phone = str(start_phone_base + phone_offset + i)
        msg_text = sample_messages[i % len(sample_messages)]
        msg_time = now - timedelta(minutes=random.randint(1, 10000))

        convo = models.ChatConversation(
            client_id=client_id,
            phone=phone,
            contact_name=name,
            last_message_content=msg_text,
            last_message_at=msg_time,
            status="open",
            unread_count=random.choice([0, 1, 2]),
            last_contact_message_at=msg_time,
            created_at=msg_time
        )
        db.add(convo)
        db.flush()

        msg = models.ChatMessage(
            conversation_id=convo.id,
            sender_type="contact",
            content=msg_text,
            message_type="text",
            timestamp=msg_time,
            status="delivered"
        )
        messages_to_create.append(msg)

        if len(messages_to_create) >= 1000:
            db.add_all(messages_to_create)
            db.commit()
            messages_to_create = []

    if messages_to_create:
        db.add_all(messages_to_create)
        db.commit()

    logger.info(f"✅ [SEED_CONVERSATIONS] {count} conversas geradas com sucesso para o Cliente #{client_id}.")

    return {
        "status": "success",
        "message": f"{count} conversas geradas com sucesso para o cliente ativo.",
        "total_created": count
    }

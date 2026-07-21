from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel, Field
from core.deps import get_db, get_current_user
from core.logger import setup_logger
import models
from core.clients.whatsapp.client import WhatsAppClient
from datetime import datetime, timezone
import os
from chatwoot_client import ChatwootClient
import httpx
import mimetypes
import tempfile
from services.chat_media_service import upload_media_to_meta_from_url

logger = setup_logger("ChatRouter")
router = APIRouter()

def get_client_id(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    current_user: models.User = Depends(get_current_user)
) -> int:
    if x_client_id:
        return x_client_id
    if current_user.client_id:
        return current_user.client_id
    return None

@router.get("/chat/agents")
async def list_chat_agents(
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista os usuários com acesso ao cliente ativo, para permitir atribuir conversas a um atendente.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    agents = (
        db.query(models.User)
        .outerjoin(models.user_clients, models.user_clients.c.user_id == models.User.id)
        .filter(
            models.User.is_active == True,
            or_(
                models.User.client_id == client_id,
                models.user_clients.c.client_id == client_id,
                # super_admin tem acesso a qualquer cliente mesmo sem estar vinculado
                # explicitamente via accessible_clients — por isso entra na lista de qualquer cliente
                models.User.role == "super_admin"
            )
        )
        .distinct()
        .all()
    )

    return [
        {"id": a.id, "full_name": a.full_name or a.email, "email": a.email}
        for a in agents
    ]

@router.post("/chat/conversations/get-or-create")
async def get_or_create_conversation(
    payload: dict,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    phone = payload.get("phone")
    contact_name = payload.get("contact_name") or payload.get("name") or "Lead"
    if not phone:
        raise HTTPException(status_code=400, detail="Telefone é obrigatório")

    clean_phone = "".join(filter(str.isdigit, str(phone)))
    last8 = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

    all_convos = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id
    ).all()

    convo = None
    for c in all_convos:
        c_phone_digits = "".join(filter(str.isdigit, str(c.phone or "")))
        if c_phone_digits == clean_phone or (len(c_phone_digits) >= 8 and c_phone_digits[-8:] == last8):
            convo = c
            break

    if not convo:
        convo = models.ChatConversation(
            client_id=client_id,
            phone=clean_phone,
            contact_name=contact_name,
            status="open"
        )
        db.add(convo)
        db.commit()
        db.refresh(convo)

    return {
        "id": convo.id,
        "phone": convo.phone,
        "contact_name": convo.contact_name,
        "last_contact_message_at": convo.last_contact_message_at.isoformat() if convo.last_contact_message_at else None
    }


@router.get("/chat/conversations")
async def list_conversations(
    tab: str = "todos",  # minha, nao_atribuida, todos
    status: str = "open",  # open, resolved, all
    search: Optional[str] = None,
    label: Optional[str] = None,
    block_status: Optional[str] = None,  # blocked, resting
    has_note: Optional[bool] = None,  # só conversas com anotação privada preenchida
    start_date: Optional[str] = None,  # formato YYYY-MM-DD
    end_date: Optional[str] = None,    # formato YYYY-MM-DD
    unread_only: Optional[bool] = None,
    window_open_only: Optional[bool] = None,
    urgent_only: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Tratar objetos Query do FastAPI passados como default em testes
    if not isinstance(page, int):
        page = 1
    if not isinstance(limit, int):
        limit = 20

    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)

    # Filtro de Status
    if status != "all":
        query = query.filter(models.ChatConversation.status == status)

    # Filtro: não lidas apenas
    if unread_only:
        query = query.filter(models.ChatConversation.unread_count > 0)

    # Filtro: janela de 24h aberta apenas
    if window_open_only:
        from datetime import timedelta
        limit_time = datetime.utcnow() - timedelta(hours=24)
        query = query.filter(models.ChatConversation.last_contact_message_at >= limit_time)

    # Filtro: urgentes apenas
    if urgent_only:
        query = query.filter(models.ChatConversation.urgent == True)

    # Filtro por Datas
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.ChatConversation.last_message_at >= start_dt)
        except Exception as e_dt:
            print(f"Erro ao parsear start_date: {e_dt}")

    if end_date:
        try:
            from datetime import time
            end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
            query = query.filter(models.ChatConversation.last_message_at <= end_dt)
        except Exception as e_dt:
            print(f"Erro ao parsear end_date: {e_dt}")

    # Filtro da Aba (Atribuição)
    if tab == "minha":
        query = query.filter(models.ChatConversation.assigned_user_id == current_user.id)
    elif tab == "nao_atribuida":
        query = query.filter(models.ChatConversation.assigned_user_id == None)

    # Filtro de Busca (Nome, Telefone ou conteúdo de alguma mensagem trocada na conversa)
    if search:
        search_term = f"%{search}%"
        message_match = (
            db.query(models.ChatMessage.id)
            .filter(
                models.ChatMessage.conversation_id == models.ChatConversation.id,
                models.ChatMessage.content.ilike(search_term)
            )
            .exists()
        )
        query = query.filter(
            models.ChatConversation.contact_name.ilike(search_term) |
            models.ChatConversation.phone.ilike(search_term) |
            message_match
        )

    # Filtro: só conversas com anotação privada preenchida
    if has_note:
        query = query.filter(
            models.ChatConversation.private_note.isnot(None),
            models.ChatConversation.private_note != ''
        )

    conversations = query.order_by(
        models.ChatConversation.pinned.desc(),
        models.ChatConversation.last_message_at.desc()
    ).all()
    
    # Filtro de Etiqueta/Marcador
    if label:
        clean_label = label.strip().lower()
        conversations = [
            c for c in conversations
            if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
        ]

    # Mapear status de bloqueio/repouso por número (últimos 8 dígitos) para exibir na lista
    now = datetime.utcnow()
    blocked_entries = db.query(models.BlockedContact.phone).filter(
        models.BlockedContact.client_id == client_id
    ).all()
    blocked_suffixes = {b.phone[-8:] for b in blocked_entries if b.phone and len(b.phone) >= 8}

    resting_entries = db.query(models.RestingContact.phone, models.RestingContact.expires_at).filter(
        models.RestingContact.client_id == client_id,
        models.RestingContact.expires_at > now
    ).all()
    resting_map = {r.phone[-8:]: r.expires_at for r in resting_entries if r.phone and len(r.phone) >= 8}

    def get_block_info(phone: Optional[str]):
        digits = "".join(filter(str.isdigit, phone or ""))
        if len(digits) < 8:
            return None, None
        suffix = digits[-8:]
        if suffix in blocked_suffixes:
            return "blocked", None
        if suffix in resting_map:
            return "resting", resting_map[suffix]
        return None, None

    # Buscar todos os triggers ativos do cliente para mapear o funil ativo
    active_triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended'])
    ).all()
    active_funnels_map = {}
    for t in active_triggers:
        if t.funnel_id and t.contact_phone:
            digits = "".join(filter(str.isdigit, t.contact_phone))
            if len(digits) >= 8:
                funnel = db.query(models.Funnel).get(t.funnel_id)
                if funnel:
                    active_funnels_map[digits[-8:]] = {
                        "id": funnel.id,
                        "name": funnel.name,
                        "status": t.status
                    }

    # Adicionar serialização simples
    result = []
    for c in conversations:
        block_type, resting_until = get_block_info(c.phone)

        # Filtro por tipo de bloqueio (aplicado após calcular o status, pois depende do cruzamento de tabelas)
        if block_status and block_type != block_status:
            continue

        digits = "".join(filter(str.isdigit, c.phone or ""))
        suffix_key = digits[-8:] if len(digits) >= 8 else None
        active_funnel = active_funnels_map.get(suffix_key) if suffix_key else None

        result.append({
            "id": c.id,
            "client_id": c.client_id,
            "phone": c.phone,
            "contact_name": c.contact_name,
            "last_message_content": c.last_message_content,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "status": c.status,
            "unread_count": c.unread_count,
            "assigned_user_id": c.assigned_user_id,
            "assigned_user_name": c.assigned_user.full_name if c.assigned_user else None,
            "labels": c.labels or [],
            "last_contact_message_at": c.last_contact_message_at.isoformat() if c.last_contact_message_at else None,
            "pinned": c.pinned,
            "urgent": c.urgent,
            "private_note": c.private_note,
            "block_status": block_type,  # None | "blocked" | "resting"
            "resting_until": resting_until.isoformat() if resting_until else None,
            "active_funnel": active_funnel
        })
    total_count = len(result)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_result = result[start_idx:end_idx]

    return {
        "conversations": paginated_result,
        "total_count": total_count,
        "page": page,
        "limit": limit
    }

@router.get("/chat/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: int,
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

    # Marcar como lida automaticamente ao carregar as mensagens
    convo.unread_count = 0
    db.commit()

    query = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    )

    if before_id is not None:
        query = query.filter(models.ChatMessage.id < before_id)

    # Obter os mais recentes primeiro para limitar
    messages = query.order_by(models.ChatMessage.timestamp.desc(), models.ChatMessage.id.desc()).limit(limit).all()
    # Reverter em Python para retornar em ordem cronológica (asc)
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
            "meta_data": m.meta_data
        })
    return result

@router.post("/chat/conversations/{conversation_id}/messages")
async def send_chat_message(
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

    content = payload.get("content")
    is_private = payload.get("is_private", False)
    if not content:
        raise HTTPException(status_code=400, detail="O conteúdo da mensagem é obrigatório.")

    wa_msg_id = None
    sender_type = "user"

    if is_private:
        # Nota privada: não envia para o WhatsApp e não valida a janela de 24h
        sender_type = "system"  # Notas privadas salvas como tipo de sistema no histórico
    else:
        # Mensagem normal: Validar janela de 24 horas da API Oficial
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

        # Enviar mensagem real usando o WhatsAppClient
        wa_client = WhatsAppClient(client_id=client_id)
        try:
            response = await wa_client.send_text_official(convo.phone, content)
            if isinstance(response, dict) and response.get("error"):
                logger.error(f"❌ Erro de envio de WhatsApp: {response}")
                raise HTTPException(status_code=400, detail=response.get("detail") or "Erro ao enviar mensagem pelo WhatsApp.")
        except Exception as e:
            logger.error(f"❌ Falha ao chamar a API do WhatsApp: {e}")
            raise HTTPException(status_code=500, detail=f"Erro de comunicação com o WhatsApp: {str(e)}")

        if isinstance(response, dict) and "messages" in response:
            wa_msg_id = response["messages"][0].get("id")

    # Salvar mensagem localmente
    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type=sender_type,
        user_id=current_user.id,
        message_type="text",
        content=content,
        wa_message_id=wa_msg_id
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

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": new_message.wa_message_id
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
    button_actions = payload.get("button_actions")  # ex: {"Texto Botão": {"type": "block"|"interaction", "funnel_id": 123}}

    # --- Verificar janela de 24h para fins informativos (saber se o envio sairá grátis) ---
    window_open = False
    if convo.last_contact_message_at:
        last_msg_time = convo.last_contact_message_at
        if last_msg_time.tzinfo is None:
            last_msg_time = last_msg_time.replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - last_msg_time
        window_open = diff.total_seconds() <= 24 * 3600

    # Sempre envia como Template oficial para garantir que os botões interativos apareçam
    cw = ChatwootClient(client_id=client_id)
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

    sent_as_text = window_open  # Usaremos esta flag para indicar se o envio ocorreu de graça na janela




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


    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="user",
        user_id=current_user.id,
        message_type="text",
        content=content,
        wa_message_id=wa_msg_id,
        meta_data=meta_data
    )
    db.add(new_message)

    # Reabre a janela de 24h (para fins de interface e exibição local)
    convo.last_message_content = content
    convo.unread_count = 0
    db.commit()
    db.refresh(new_message)

    # Criar ScheduledTrigger para rastrear button_actions deste template
    # Permite que o worker execute bloqueio ou disparo de funil quando o contato clicar em um botão
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

    # Disparar webhook de memória para o template enviado pelo Chat
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

    # Broadcast via WebSocket em tempo real para o frontend

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
        "sent_as_text": sent_as_text  # True = enviado como texto livre (janela aberta), False = template HSM
    }

@router.post("/chat/conversations/{conversation_id}/labels")
async def update_conversation_labels(
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

    labels = payload.get("labels", [])
    if not isinstance(labels, list):
        raise HTTPException(status_code=400, detail="Etiquetas devem ser enviadas em formato de lista.")

    old_labels = convo.labels or []
    
    # Adicionado: Definir human_handover_at se a etiqueta de humano foi colocada manualmente
    from config_loader import get_setting
    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    if human_label:
        clean_human_label = human_label.lower()
        has_human_label = clean_human_label in [l.lower() for l in labels]
        
        # Se contiver a etiqueta e o human_handover_at estiver nulo, define
        if has_human_label and not convo.human_handover_at:
            convo.human_handover_at = datetime.now(timezone.utc)
        # Se a etiqueta de humano foi removida, limpa a data
        elif not has_human_label and convo.human_handover_at:
            convo.human_handover_at = None

    # Detectar adição e remoção de etiquetas para registrar no histórico
    added = [l for l in labels if l not in old_labels]
    removed = [l for l in old_labels if l not in labels]
    
    events = []
    if added:
        events.append(f"adicionou marcador(es): {', '.join(added)}")
    if removed:
        events.append(f"removeu marcador(es): {', '.join(removed)}")
        
    if events:
        event_text = f"O atendente {current_user.full_name or current_user.email} " + " e ".join(events)
        system_msg = models.ChatMessage(
            conversation_id=conversation_id,
            sender_type="system",
            message_type="text",
            content=event_text,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(system_msg)

    convo.labels = labels
    db.commit()
    return {"status": "ok", "labels": convo.labels, "human_handover_at": convo.human_handover_at.isoformat() if convo.human_handover_at else None}

@router.post("/chat/conversations/{conversation_id}/status")
async def update_conversation_status(
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

    status = payload.get("status")
    if status not in ["open", "resolved"]:
        raise HTTPException(status_code=400, detail="Status inválido. Use 'open' ou 'resolved'.")

    convo.status = status
    db.commit()
    return {"status": "ok", "conversation_status": convo.status}

@router.post("/chat/conversations/{conversation_id}/assign")
async def assign_conversation(
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

    user_id = payload.get("user_id")
    old_assigned = convo.assigned_user.full_name if convo.assigned_user else None
    
    if user_id is not None:
        target_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=400, detail="Usuário não encontrado para atribuição.")
        convo.assigned_user_id = user_id
        new_assigned = target_user.full_name
        
        # Registrar evento de atribuição
        event_text = f"O atendente {current_user.full_name or current_user.email} atribuiu a conversa para {new_assigned}"
        system_msg = models.ChatMessage(
            conversation_id=conversation_id,
            sender_type="system",
            message_type="text",
            content=event_text,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(system_msg)
    else:
        convo.assigned_user_id = None
        if old_assigned:
            # Registrar evento de remoção de atribuição
            event_text = f"O atendente {current_user.full_name or current_user.email} removeu a atribuição de {old_assigned}"
            system_msg = models.ChatMessage(
                conversation_id=conversation_id,
                sender_type="system",
                message_type="text",
                content=event_text,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(system_msg)

    db.commit()
    return {
        "status": "ok",
        "assigned_user_id": convo.assigned_user_id,
        "assigned_user_name": convo.assigned_user.full_name if convo.assigned_user else None
    }

@router.post("/chat/conversations/{conversation_id}/read")
async def mark_as_read(
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

    convo.unread_count = 0
    db.commit()
    return {"status": "ok"}



@router.get("/chat/media/{media_id}")
async def proxy_whatsapp_media(
    media_id: str,
    client_id: int,  # Passado no query parameter pela tag img/video do frontend
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from config_loader import get_setting
    import httpx
    from fastapi.responses import StreamingResponse
    from jose import jwt
    from core.security import SECRET_KEY, ALGORITHM

    # Validar token do query parameter obrigatoriamente
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
        # 1. Obter a URL de download da Meta
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
                
            # 2. Fazer o download do binário
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

    # Validar janela de 24 horas da API Oficial
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
    m_type = payload.get("message_type")  # image, video, audio, document
    caption = payload.get("caption", "")
    if not media_url or not m_type:
        raise HTTPException(status_code=400, detail="Mídia URL e Tipo de Mensagem são obrigatórios.")

    wa_client = WhatsAppClient(client_id=client_id)

    # Para imagem/vídeo/documento: fazer upload para a Meta antes de enviar
    meta_media_id = None
    if m_type in ["image", "video", "document"]:
        meta_media_id = await upload_media_to_meta_from_url(wa_client, media_url, m_type)
        if meta_media_id is None:
            # Upload falhou — provavelmente arquivo acima do limite da Meta
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
                response = await wa_client._meta_request("POST", "messages", json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": ''.join(filter(str.isdigit, convo.phone)),
                    "type": "image",
                    "image": {"id": meta_media_id, "caption": caption}
                })
            else:
                response = await wa_client.send_image_official(convo.phone, media_url, caption=caption)
        elif m_type == "video":
            if meta_media_id:
                response = await wa_client._meta_request("POST", "messages", json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": ''.join(filter(str.isdigit, convo.phone)),
                    "type": "video",
                    "video": {"id": meta_media_id, "caption": caption}
                })
            else:
                response = await wa_client.send_video_official(convo.phone, media_url, caption=caption)
        elif m_type in ["audio", "voice"]:
            response = await wa_client.send_audio_official(convo.phone, media_url)
        elif m_type == "document":
            if meta_media_id:
                response = await wa_client._meta_request("POST", "messages", json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": ''.join(filter(str.isdigit, convo.phone)),
                    "type": "document",
                    "document": {"id": meta_media_id, "caption": caption, "filename": "documento"}
                })
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

    # Montar texto de exibição
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
        wa_message_id=wa_msg_id
    )
    db.add(new_message)

    convo.last_message_content = content_text
    convo.unread_count = 0
    convo.last_message_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "media_url": new_message.media_url,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": new_message.wa_message_id
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

    if msg.sender_type != "user":
        raise HTTPException(status_code=403, detail="Só é possível deletar mensagens enviadas pelo agente.")

    wa_result = {"skipped": True}
    if msg.wa_message_id:
        wa_client = WhatsAppClient(client_id=client_id)
        wa_result = await wa_client.delete_message(msg.wa_message_id)

    db.delete(msg)
    db.commit()

    return {"success": True, "wa_result": wa_result}


@router.post("/chat/conversations/{conversation_id}/pin")
async def toggle_pin_conversation(
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

    pinned = payload.get("pinned", False)
    convo.pinned = pinned
    db.commit()
    return {"status": "ok", "pinned": convo.pinned}


@router.post("/chat/conversations/{conversation_id}/urgent")
async def toggle_urgent_conversation(
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

    urgent = payload.get("urgent", False)
    convo.urgent = urgent
    db.commit()
    return {"status": "ok", "urgent": convo.urgent}


@router.post("/chat/conversations/{conversation_id}/funnel")
async def trigger_funnel_for_conversation(
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

    funnel_id = payload.get("funnel_id")
    if not funnel_id:
        raise HTTPException(status_code=400, detail="Funil não especificado.")

    funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == client_id
    ).first()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")

    # Verificar se já existe execução ativa para este telefone
    existing_active = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == client_id,
        models.ScheduledTrigger.funnel_id == funnel_id,
        models.ScheduledTrigger.contact_phone == convo.phone,
        models.ScheduledTrigger.status.in_(['queued', 'processing', 'paused_waiting_delivery', 'suspended'])
    ).first()

    if existing_active:
        raise HTTPException(status_code=400, detail="Este funil já está em execução para este contato.")

    # Criar trigger de execução
    trigger = models.ScheduledTrigger(
        client_id=client_id,
        funnel_id=funnel_id,
        conversation_id=convo.id,
        status='queued',
        is_bulk=False,
        contact_phone=convo.phone,
        contact_name=convo.contact_name or convo.phone,
        contacts_list=[{
            "id": str(convo.id),
            "meta": {"sender": {"name": convo.contact_name or convo.phone, "phone_number": convo.phone}}
        }],
        scheduled_time=datetime.now(timezone.utc)
    )

    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    # Disparar no RabbitMQ imediatamente
    from rabbitmq_client import rabbitmq
    try:
        await rabbitmq.publish("zapvoice_funnel_executions", {
            "trigger_id": trigger.id,
            "funnel_id": funnel_id,
            "contact_phone": convo.phone
        })
        trigger.status = 'processing'
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao publicar execução manual de funil: {e}")
        pass

    return {
        "status": "ok",
        "trigger_id": trigger.id,
        "funnel_id": funnel_id,
        "funnel_name": funnel.name,
        "trigger_status": trigger.status
    }


@router.post("/chat/conversations/{conversation_id}/note")
async def update_conversation_note(
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

    private_note = payload.get("private_note", "")
    convo.private_note = private_note
    
    # Salvar nota como uma mensagem interna visível no chat
    new_message = models.ChatMessage(
        conversation_id=convo.id,
        sender_type="system",
        user_id=current_user.id,
        message_type="text",
        content=f"🔒 Anotação Privada: {private_note}",
    )
    db.add(new_message)
    
    # Atualizar conteúdo da última mensagem na lista
    convo.last_message_content = f"🔒 Nota: {private_note}"
    convo.last_message_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"status": "ok", "private_note": convo.private_note, "message": {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "sender_type": new_message.sender_type,
        "user_id": new_message.user_id,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else datetime.now().isoformat(),
        "wa_message_id": None
    }}


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
        query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)
        
        tab = payload.get("tab", "todos")
        status = payload.get("status", "open")
        search = payload.get("search")
        label = payload.get("label")
        block_status = payload.get("block_status")
        has_note = payload.get("has_note")
        start_date = payload.get("start_date")
        end_date = payload.get("end_date")
        unread_only = payload.get("unread_only")
        window_open_only = payload.get("window_open_only")

        # Filtro de Status
        if status != "all":
            query = query.filter(models.ChatConversation.status == status)

        # Filtro: não lidas apenas
        if unread_only:
            query = query.filter(models.ChatConversation.unread_count > 0)

        # Filtro: janela de 24h aberta apenas
        if window_open_only:
            from datetime import timedelta
            limit_time = datetime.utcnow() - timedelta(hours=24)
            query = query.filter(models.ChatConversation.last_contact_message_at >= limit_time)

        # Filtro por Datas
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(models.ChatConversation.last_message_at >= start_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear start_date na exclusão bulk: {e_dt}")

        if end_date:
            try:
                from datetime import time
                end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d"), time(23, 59, 59, 999999))
                query = query.filter(models.ChatConversation.last_message_at <= end_dt)
            except Exception as e_dt:
                logger.error(f"Erro ao parsear end_date na exclusão bulk: {e_dt}")

        # Filtro da Aba (Atribuição)
        if tab == "minha":
            query = query.filter(models.ChatConversation.assigned_user_id == current_user.id)
        elif tab == "nao_atribuida":
            query = query.filter(models.ChatConversation.assigned_user_id == None)

        # Filtro de Busca (Nome, Telefone ou conteúdo de alguma mensagem)
        if search:
            search_term = f"%{search}%"
            message_match = (
                db.query(models.ChatMessage.id)
                .filter(
                    models.ChatMessage.conversation_id == models.ChatConversation.id,
                    models.ChatMessage.content.ilike(search_term)
                )
                .exists()
            )
            query = query.filter(
                models.ChatConversation.contact_name.ilike(search_term) |
                models.ChatConversation.phone.ilike(search_term) |
                message_match
            )

        # Filtro: só conversas com anotação privada preenchida
        if has_note:
            query = query.filter(
                models.ChatConversation.private_note.isnot(None),
                models.ChatConversation.private_note != ''
            )

        conversations = query.all()

        # Filtro de Etiqueta/Marcador em Python (conforme listagem)
        if label:
            clean_label = label.strip().lower()
            conversations = [
                c for c in conversations
                if isinstance(c.labels, list) and clean_label in [l.lower() for l in c.labels]
            ]

        # Filtro de status de bloqueio em Python (conforme listagem)
        if block_status:
            now = datetime.utcnow()
            blocked_entries = db.query(models.BlockedContact.phone).filter(
                models.BlockedContact.client_id == client_id
            ).all()
            blocked_suffixes = {b.phone[-8:] for b in blocked_entries if b.phone and len(b.phone) >= 8}

            resting_entries = db.query(models.RestingContact.phone, models.RestingContact.expires_at).filter(
                models.RestingContact.client_id == client_id,
                models.RestingContact.expires_at > now
            ).all()
            resting_map = {r.phone[-8:]: r.expires_at for r in resting_entries if r.phone and len(r.phone) >= 8}

            def get_block_info(phone: Optional[str]):
                digits = "".join(filter(str.isdigit, phone or ""))
                if len(digits) < 8:
                    return None, None
                suffix = digits[-8:]
                if suffix in blocked_suffixes:
                    return "blocked", None
                if suffix in resting_map:
                    return "resting", resting_map[suffix]
                return None, None

            filtered_conversations = []
            for c in conversations:
                block_type, _ = get_block_info(c.phone)
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


class ResendAgentFlowPayload(BaseModel):
    content: Optional[str] = None


@router.post("/chat/messages/{message_id}/resend-agentflow")
async def resend_message_to_agentflow(
    message_id: int,
    payload_data: Optional[ResendAgentFlowPayload] = None,
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from services.chat_webhook_service import dispatch_webhook_in_thread
    from config_loader import get_setting
    from models import ChatMessage, ChatConversation, WebhookLead
    
    # 1. Obter a mensagem
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")
        
    # 2. Validar IDOR (se a conversa pertence ao client_id)
    convo = db.query(ChatConversation).filter(
        ChatConversation.id == message.conversation_id,
        ChatConversation.client_id == client_id
    ).first()
    if not convo:
        raise HTTPException(status_code=403, detail="Acesso negado a esta mensagem.")
        
    # 3. Validar se é mensagem de contato
    if message.sender_type != "contact":
        raise HTTPException(status_code=400, detail="Apenas mensagens recebidas de contatos podem ser enviadas ao AgentFlow.")
        
    # Se fornecido conteúdo modificado, atualizar no banco
    if payload_data and payload_data.content is not None:
        message.content = payload_data.content
        db.commit()
        
    # 4. Buscar webhook url
    webhook_url = get_setting("CHAT_MESSAGES_WEBHOOK_URL", "", client_id=client_id)
    if not webhook_url or not webhook_url.strip():
        raise HTTPException(status_code=400, detail="Webhook de Mensagens (AgentFlow) não está configurado.")
        
    # 5. Montar payload
    lead = db.query(WebhookLead).filter(
        WebhookLead.client_id == client_id,
        WebhookLead.phone == convo.phone
    ).first()
    bsud = lead.bsud if lead else None
    
    # Calcular metadados da janela de 24h
    window_24h_data = None
    if convo.last_contact_message_at:
        from datetime import timedelta
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
    
    # 6. Atualizar status para "sending" no banco
    message.agentflow_webhook_status = "sending"
    message.agentflow_webhook_error = None
    db.commit()
    
    # 7. Despachar
    dispatch_webhook_in_thread(webhook_url, payload, message.id)
    
    return {"status": "success", "detail": "Reenvio de webhook iniciado."}


@router.get("/chat/human-conversations")
async def list_human_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from config_loader import get_setting
    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    if not human_label:
        return {"total": 0, "data": []}

    # Buscar conversas que contenham a etiqueta de humano
    conversations = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.status == "open"
    ).all()

    clean_human_label = human_label.lower()
    human_convos = []
    for c in conversations:
        if isinstance(c.labels, list) and clean_human_label in [l.lower() for l in c.labels]:
            handover_iso = c.human_handover_at.isoformat() if c.human_handover_at else c.last_message_at.isoformat() if c.last_message_at else None
            human_convos.append({
                "id": c.id,
                "phone": c.phone,
                "contact_name": c.contact_name or c.phone,
                "human_handover_at": handover_iso,
                "last_message_content": c.last_message_content,
                "labels": c.labels
            })

    total = len(human_convos)
    
    # Paginar na memória (já que filtramos pós-query pela tag no campo JSON)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_convos = human_convos[start_idx:end_idx]

    return {
        "total": total,
        "data": paginated_convos
    }


@router.post("/chat/conversations/{conversation_id}/finish-human-handover")
async def finish_human_handover(
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

    from config_loader import get_setting
    human_label = get_setting("WA_HUMAN_LABEL", "", client_id=client_id).strip()
    robo_label = get_setting("WA_ROBO_LABEL", "", client_id=client_id).strip()

    current_labels = list(convo.labels or [])
    
    # Remover etiqueta humano
    if human_label and human_label in current_labels:
        current_labels.remove(human_label)
    
    # Adicionar etiqueta robo
    if robo_label and robo_label not in current_labels:
        current_labels.append(robo_label)
        
    convo.labels = current_labels
    convo.human_handover_at = None
    db.commit()

    return {"status": "success", "labels": convo.labels}



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
import httpx
import mimetypes
import tempfile

logger = setup_logger("ChatRouter")
router = APIRouter()

async def _upload_media_to_meta_from_url(wa_client: WhatsAppClient, media_url: str, media_type: str) -> Optional[str]:
    """
    Baixa a mídia de uma URL (resolvendo URLs internas do MinIO quando necessário)
    e faz upload para a Meta, retornando o media_id.
    Retorna None se falhar (neste caso, deve-se tentar enviar por link).
    """
    # Resolver URL interna do MinIO: substituir URL pública pelo hostname interno
    internal_url = media_url
    s3_public_url = os.getenv("S3_PUBLIC_URL", "")
    s3_endpoint_url = os.getenv("S3_ENDPOINT_URL", "")
    
    if s3_public_url and s3_endpoint_url and s3_public_url in media_url:
        # Substituir URL pública (localhost:9005) pela URL interna do container (zapvoice-minio:9000)
        internal_url = media_url.replace(s3_public_url, s3_endpoint_url)
        logger.info(f"🔄 [CHAT_MEDIA] Resolvendo URL interna do MinIO: {s3_public_url} -> {s3_endpoint_url}")
    
    # Determinar o tipo MIME correto
    ext_map = {
        "image": "image/jpeg",
        "video": "video/mp4",
        "audio": "audio/ogg",
        "document": "application/pdf"
    }
    
    try:
        # Baixar o arquivo
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"📥 [CHAT_MEDIA] Baixando arquivo de: {internal_url}")
            r = await client.get(internal_url)
            if r.status_code != 200:
                logger.error(f"❌ [CHAT_MEDIA] Falha ao baixar arquivo ({r.status_code}): {internal_url}")
                return None
            
            content = r.content
            content_type = r.headers.get("content-type", "").split(";")[0].strip()
            if not content_type or content_type == "application/octet-stream":
                content_type = ext_map.get(media_type, "application/octet-stream")
            
            # Salvar em arquivo temporário
            ext = mimetypes.guess_extension(content_type) or f".{media_type}"
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
        
        # Upload para a Meta
        logger.info(f"📤 [CHAT_MEDIA] Fazendo upload para a Meta | tipo: {content_type}")
        media_id = await wa_client.upload_media_to_meta(tmp_path, content_type)
        
        if media_id:
            logger.info(f"✅ [CHAT_MEDIA] Upload para Meta bem-sucedido! media_id: {media_id}")
        else:
            logger.error(f"❌ [CHAT_MEDIA] Meta não retornou media_id")
        
        return media_id
    except Exception as e:
        logger.error(f"❌ [CHAT_MEDIA] Erro ao fazer upload para a Meta: {e}")
        return None
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except: pass

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
    client_id: int = Depends(get_client_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    query = db.query(models.ChatConversation).filter(models.ChatConversation.client_id == client_id)

    # Filtro de Status
    if status != "all":
        query = query.filter(models.ChatConversation.status == status)

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

    # Adicionar serialização simples
    result = []
    for c in conversations:
        block_type, resting_until = get_block_info(c.phone)

        # Filtro por tipo de bloqueio (aplicado após calcular o status, pois depende do cruzamento de tabelas)
        if block_status and block_type != block_status:
            continue

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
            "private_note": c.private_note,
            "block_status": block_type,  # None | "blocked" | "resting"
            "resting_until": resting_until.isoformat() if resting_until else None
        })
    return result

@router.get("/chat/conversations/{conversation_id}/messages")
async def list_messages(
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

    # Marcar como lida automaticamente ao carregar as mensagens
    convo.unread_count = 0
    db.commit()

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation_id
    ).order_by(models.ChatMessage.timestamp.asc()).all()

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

    # Atualizar dados da conversa
    convo.last_message_content = f"🔒 Nota: {content}" if is_private else content
    convo.unread_count = 0  # Resposta do agente ou nota zera mensagens não lidas
    convo.last_message_at = datetime.now(timezone.utc)
    
    db.commit()

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

    convo.labels = labels
    db.commit()
    return {"status": "ok", "labels": convo.labels}

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
    if user_id is not None:
        target_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=400, detail="Usuário não encontrado para atribuição.")
        convo.assigned_user_id = user_id
    else:
        convo.assigned_user_id = None

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

class ChatLabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field("#3B82F6", max_length=7)

class ChatLabelOut(BaseModel):
    id: int
    name: str
    color: str
    is_legacy: bool = False

    class Config:
        from_attributes = True

@router.get("/chat/labels")
async def list_chat_labels(
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")
    
    # 1. Obter etiquetas definidas globalmente no banco de dados
    db_labels = db.query(models.ChatLabel).filter(
        models.ChatLabel.client_id == client_id
    ).all()
    
    unique_labels = set(label.name for label in db_labels)
    
    # 2. Obter etiquetas legadas extraídas dinamicamente de conversas ativas
    convs = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.labels.isnot(None)
    ).all()
    
    for c in convs:
        if isinstance(c.labels, list):
            for label in c.labels:
                unique_labels.add(label)
                
    return sorted(list(unique_labels))

@router.get("/chat/labels/details", response_model=List[ChatLabelOut])
async def list_chat_labels_details(
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")
    
    # 1. Obter etiquetas definidas no banco
    db_labels = db.query(models.ChatLabel).filter(
        models.ChatLabel.client_id == client_id
    ).order_by(models.ChatLabel.created_at.desc()).all()
    
    registered_names = {label.name.lower(): label for label in db_labels}
    
    # 2. Obter etiquetas extraídas dinamicamente de conversas ativas
    convs = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.labels.isnot(None)
    ).all()
    
    legacy_labels = {}
    for c in convs:
        if isinstance(c.labels, list):
            for label_name in c.labels:
                name_clean = label_name.strip()
                if not name_clean:
                    continue
                name_lower = name_clean.lower()
                # Se não estiver cadastrado e ainda não foi listado na pilha legacy
                if name_lower not in registered_names and name_lower not in legacy_labels:
                    legacy_labels[name_lower] = {
                        "id": 0,  # ID 0 indica que é dinâmico/legacy
                        "name": name_clean,
                        "color": "#64748B",  # Cor cinza ardósia neutra
                        "is_legacy": True
                    }
    
    # Unificar a lista (cadastrados primeiro, depois os dinâmicos/legacy)
    result = []
    for label in db_labels:
        result.append({
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "is_legacy": False
        })
    for legacy in legacy_labels.values():
        result.append(legacy)
        
    return result

@router.post("/chat/labels", response_model=ChatLabelOut)
async def create_chat_label(
    payload: ChatLabelCreate,
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")
        
    label_name = payload.name.strip()
    
    # Verificar se etiqueta já existe com este nome para o cliente
    exists = db.query(models.ChatLabel).filter(
        models.ChatLabel.client_id == client_id,
        models.ChatLabel.name.ilike(label_name)
    ).first()
    
    if exists:
        raise HTTPException(status_code=400, detail="Já existe um marcador com este nome.")
        
    try:
        db_label = models.ChatLabel(
            client_id=client_id,
            name=label_name,
            color=payload.color.strip()
        )
        db.add(db_label)
        db.commit()
        db.refresh(db_label)
        return db_label
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ao criar marcador: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao criar marcador.")

@router.put("/chat/labels/{label_id}", response_model=ChatLabelOut)
async def update_chat_label(
    label_id: int,
    payload: ChatLabelCreate,
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")
        
    label_name = payload.name.strip()
    
    # 1. Se label_id for 0 (dinâmico/legacy), convertemos em um novo registro salvo no banco
    if label_id == 0:
        # Verificar se já existe cadastrada com este nome
        exists = db.query(models.ChatLabel).filter(
            models.ChatLabel.client_id == client_id,
            models.ChatLabel.name.ilike(label_name)
        ).first()
        if exists:
            # Se já existe, atualizamos apenas a cor
            exists.color = payload.color.strip()
            db.commit()
            db.refresh(exists)
            return exists
            
        db_label = models.ChatLabel(
            client_id=client_id,
            name=label_name,
            color=payload.color.strip()
        )
        db.add(db_label)
        db.commit()
        db.refresh(db_label)
        return db_label
        
    # 2. Se label_id > 0, atualizamos a etiqueta existente
    db_label = db.query(models.ChatLabel).filter(
        models.ChatLabel.id == label_id,
        models.ChatLabel.client_id == client_id
    ).first()
    
    if not db_label:
        raise HTTPException(status_code=404, detail="Marcador não encontrado.")
        
    # Verificar se novo nome está em uso por outro marcador
    duplicate = db.query(models.ChatLabel).filter(
        models.ChatLabel.client_id == client_id,
        models.ChatLabel.name.ilike(label_name),
        models.ChatLabel.id != label_id
    ).first()
    
    if duplicate:
        raise HTTPException(status_code=400, detail="Já existe outro marcador com este nome.")
        
    try:
        db_label.name = label_name
        db_label.color = payload.color.strip()
        db.commit()
        db.refresh(db_label)
        return db_label
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ao atualizar marcador: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar marcador.")

@router.delete("/chat/labels/{label_id}")
async def delete_chat_label(
    label_id: int,
    name: Optional[str] = Query(None),
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")
        
    label_name_to_remove = None
    
    if label_id > 0:
        db_label = db.query(models.ChatLabel).filter(
            models.ChatLabel.id == label_id,
            models.ChatLabel.client_id == client_id
        ).first()
        
        if not db_label:
            raise HTTPException(status_code=404, detail="Marcador não encontrado.")
            
        label_name_to_remove = db_label.name
        try:
            db.delete(db_label)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Erro ao excluir marcador do banco: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao excluir marcador do banco.")
    else:
        # Exclusão de etiqueta legacy
        if not name:
            raise HTTPException(status_code=400, detail="Nome da etiqueta não fornecido para exclusão legacy.")
        label_name_to_remove = name.strip()
        
    # Limpar a etiqueta de todas as conversas do cliente
    if label_name_to_remove:
        try:
            convs = db.query(models.ChatConversation).filter(
                models.ChatConversation.client_id == client_id,
                models.ChatConversation.labels.isnot(None)
            ).all()
            for convo in convs:
                if isinstance(convo.labels, list) and label_name_to_remove in convo.labels:
                    convo.labels = [l for l in convo.labels if l != label_name_to_remove]
            db.commit()
            return {"status": "ok", "message": f"Marcador '{label_name_to_remove}' removido do banco e de todas as conversas."}
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Erro ao remover marcador das conversas: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao desvincular marcador das conversas.")
            
    return {"status": "ok", "message": "Nenhuma ação realizada."}

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
        meta_media_id = await _upload_media_to_meta_from_url(wa_client, media_url, m_type)

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


@router.post("/chat/messages/{message_id}/resend-agentflow")
async def resend_message_to_agentflow(
    message_id: int,
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
    
    payload = {
        "event": "message.created",
        "client_id": client_id,
        "message": {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_type": message.sender_type,
            "message_type": message.message_type,
            "content": message.content,
            "media_url": message.media_url,
            "timestamp": message.timestamp.isoformat() if message.timestamp else datetime.now(timezone.utc).isoformat(),
            "is_private": getattr(message, 'is_private', False),
            "metadata": message.meta_data or {}
        },
        "contact": {
            "phone": convo.phone,
            "name": convo.contact_name or convo.phone,
            "bsud": bsud,
            "labels": convo.labels or []
        }
    }
    
    # 6. Atualizar status para "sending" no banco
    message.agentflow_webhook_status = "sending"
    message.agentflow_webhook_error = None
    db.commit()
    
    # 7. Despachar
    dispatch_webhook_in_thread(webhook_url, payload, message.id)
    
    return {"status": "success", "detail": "Reenvio de webhook iniciado."}


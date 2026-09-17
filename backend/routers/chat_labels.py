from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from core.deps import get_db, get_current_user
from core.logger import setup_logger
import models
from routers.chat import get_client_id

logger = setup_logger("ChatLabelsRouter")
router = APIRouter()

class ChatLabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field("#3B82F6", max_length=7)

class ChatLabelOut(BaseModel):
    id: int
    name: str
    color: str
    is_legacy: bool = False
    usage_count: int = 0

    model_config = ConfigDict(from_attributes=True)

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
    
    # 2. Obter etiquetas extraídas dinamicamente de conversas ativas e calcular uso
    convs = db.query(models.ChatConversation).filter(
        models.ChatConversation.client_id == client_id,
        models.ChatConversation.labels.isnot(None)
    ).all()
    
    usage_counts = {}
    legacy_labels = {}
    for c in convs:
        if isinstance(c.labels, list):
            seen_in_conv = set()
            for label_name in c.labels:
                if not isinstance(label_name, str):
                    continue
                name_clean = label_name.strip()
                if not name_clean:
                    continue
                name_lower = name_clean.lower()
                
                # Incrementa contagem de uso por conversa única
                if name_lower not in seen_in_conv:
                    seen_in_conv.add(name_lower)
                    usage_counts[name_lower] = usage_counts.get(name_lower, 0) + 1
                
                # Se não estiver cadastrado e ainda não foi listado na pilha legacy
                if name_lower not in registered_names and name_lower not in legacy_labels:
                    legacy_labels[name_lower] = {
                        "id": 0,  # ID 0 indica que é dinâmico/legacy
                        "name": name_clean,
                        "color": "#64748B",  # Cor cinza ardósia neutra
                        "is_legacy": True,
                        "usage_count": 0
                    }
    
    # Unificar a lista (cadastrados primeiro, depois os dinâmicos/legacy)
    result = []
    for label in db_labels:
        result.append({
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "is_legacy": False,
            "usage_count": usage_counts.get(label.name.strip().lower(), 0)
        })
    for name_lower, legacy in legacy_labels.items():
        legacy["usage_count"] = usage_counts.get(name_lower, 0)
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
    if len(label_name) > 20:
        raise HTTPException(status_code=400, detail="O nome do marcador deve ter no máximo 20 caracteres.")
    
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
    if len(label_name) > 20:
        raise HTTPException(status_code=400, detail="O nome do marcador deve ter no máximo 20 caracteres.")
    
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

class TransferChatLabelPayload(BaseModel):
    source_label: str = Field(..., min_length=1, max_length=100)
    target_label: str = Field(..., min_length=1, max_length=100)
    action: str = Field("move", description="'move' (substitui) ou 'copy' (adiciona mantendo a origem)")

@router.post("/chat/labels/transfer")
async def transfer_chat_label(
    payload: TransferChatLabelPayload,
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")
        
    source_name = payload.source_label.strip()
    target_name = payload.target_label.strip()
    action = payload.action.strip().lower()
    
    if not source_name or not target_name:
        raise HTTPException(status_code=400, detail="As etiquetas de origem e destino devem ser informadas.")
        
    if source_name.lower() == target_name.lower():
        raise HTTPException(status_code=400, detail="A etiqueta de destino deve ser diferente da etiqueta de origem.")
        
    if action not in ["move", "copy"]:
        raise HTTPException(status_code=400, detail="Ação inválida. Utilize 'move' ou 'copy'.")
        
    try:
        # 1. Garantir que a etiqueta de destino exista como ChatLabel (se não existir, cadastrar)
        target_exists = db.query(models.ChatLabel).filter(
            models.ChatLabel.client_id == client_id,
            models.ChatLabel.name.ilike(target_name)
        ).first()
        
        if not target_exists:
            # Pega a cor da origem caso exista
            source_exists = db.query(models.ChatLabel).filter(
                models.ChatLabel.client_id == client_id,
                models.ChatLabel.name.ilike(source_name)
            ).first()
            color = source_exists.color if source_exists else "#3B82F6"
            
            new_label = models.ChatLabel(
                client_id=client_id,
                name=target_name,
                color=color
            )
            db.add(new_label)
            db.flush()
            
        # 2. Atualizar as conversas do Chat
        convs = db.query(models.ChatConversation).filter(
            models.ChatConversation.client_id == client_id,
            models.ChatConversation.labels.isnot(None)
        ).all()
        
        updated_convos_count = 0
        updated_convo_phones = set()
        
        for convo in convs:
            if not isinstance(convo.labels, list):
                continue
                
            labels_lower = [l.strip().lower() for l in convo.labels if isinstance(l, str)]
            if source_name.lower() in labels_lower:
                new_labels = []
                for l in convo.labels:
                    if isinstance(l, str):
                        if l.strip().lower() == source_name.lower():
                            if action == "copy":
                                new_labels.append(l)
                        else:
                            new_labels.append(l)
                            
                # Adicionar target se ainda não estiver na lista
                if target_name.lower() not in [l.strip().lower() for l in new_labels]:
                    new_labels.append(target_name)
                    
                convo.labels = new_labels
                updated_convos_count += 1
                if convo.phone:
                    clean_phone = str(convo.phone).replace('+', '').strip()
                    if clean_phone:
                        updated_convo_phones.add(clean_phone)
                        
        # 3. Sincronizar WebhookLead (Contatos/Leads)
        updated_leads_count = 0
        if updated_convo_phones:
            leads = db.query(models.WebhookLead).filter(
                models.WebhookLead.client_id == client_id,
                models.WebhookLead.phone.in_(list(updated_convo_phones))
            ).all()
            
            for lead in leads:
                existing_tags = [t.strip() for t in (lead.tags or "").split(",") if t.strip()]
                tags_lower = [t.lower() for t in existing_tags]
                
                if source_name.lower() in tags_lower:
                    new_tags = []
                    for t in existing_tags:
                        if t.lower() == source_name.lower():
                            if action == "copy":
                                new_tags.append(t)
                        else:
                            new_tags.append(t)
                            
                    if target_name.lower() not in [t.lower() for t in new_tags]:
                        new_tags.append(target_name)
                        
                    lead.tags = ", ".join(new_tags) if new_tags else None
                    updated_leads_count += 1
                    
        db.commit()
        action_text = "transferidas" if action == "move" else "copiadas"
        logger.info(f"✅ [TRANSFER_LABELS] {updated_convos_count} conversas e {updated_leads_count} contatos tiveram a etiqueta '{source_name}' {action_text} para '{target_name}' (cliente {client_id})")
        
        return {
            "status": "ok",
            "message": f"Contatos atualizados com sucesso: {updated_convos_count} conversas afetadas.",
            "updated_conversations": updated_convos_count,
            "updated_leads": updated_leads_count,
            "source_label": source_name,
            "target_label": target_name,
            "action": action
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ao transferir etiquetas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao transferir etiquetas: {str(e)}")

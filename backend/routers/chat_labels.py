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

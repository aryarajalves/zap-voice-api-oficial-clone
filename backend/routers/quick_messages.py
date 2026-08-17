from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from core.deps import get_db, get_current_user
from core.logger import setup_logger
import models
from routers.chat import get_client_id

logger = setup_logger("QuickMessagesRouter")
router = APIRouter(tags=["QuickMessages"])


class QuickMessageCreate(BaseModel):
    shortcut: str = Field(..., min_length=1, max_length=50, description="Atalho da mensagem rápida (sem a barra)")
    title: str = Field(..., min_length=1, max_length=150, description="Título descritivo da mensagem rápida")
    content: str = Field(..., min_length=1, description="Conteúdo do texto com suporte a tags {{nome}}, etc.")


class QuickMessageUpdate(BaseModel):
    shortcut: Optional[str] = Field(None, min_length=1, max_length=50)
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    content: Optional[str] = Field(None, min_length=1)


class QuickMessageOut(BaseModel):
    id: int
    client_id: int
    shortcut: str
    title: str
    content: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


def normalize_shortcut(shortcut: str) -> str:
    """Normaliza o atalho removendo barras iniciais, espaços e convertendo para minúsculas."""
    cleaned = shortcut.strip().lstrip("/").strip().lower()
    return cleaned


@router.get("/quick-messages", response_model=List[QuickMessageOut])
def list_quick_messages(
    search: Optional[str] = Query(None, description="Filtro por atalho, título ou conteúdo"),
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lista todas as mensagens rápidas do cliente autenticado."""
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    query = db.query(models.QuickMessage).filter(models.QuickMessage.client_id == client_id)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (models.QuickMessage.shortcut.ilike(s)) |
            (models.QuickMessage.title.ilike(s)) |
            (models.QuickMessage.content.ilike(s))
        )

    messages = query.order_by(models.QuickMessage.shortcut.asc()).all()
    return messages


@router.post("/quick-messages", response_model=QuickMessageOut)
def create_quick_message(
    payload: QuickMessageCreate,
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Cria uma nova mensagem rápida / automática para o cliente."""
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    clean_shortcut = normalize_shortcut(payload.shortcut)
    if not clean_shortcut:
        raise HTTPException(status_code=400, detail="O atalho não pode ser vazio.")

    # Verificar duplicidade de atalho para o mesmo client_id
    existing = db.query(models.QuickMessage).filter(
        models.QuickMessage.client_id == client_id,
        models.QuickMessage.shortcut == clean_shortcut
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Já existe uma mensagem rápida com o atalho '/{clean_shortcut}'."
        )

    new_qm = models.QuickMessage(
        client_id=client_id,
        shortcut=clean_shortcut,
        title=payload.title.strip(),
        content=payload.content.strip()
    )
    db.add(new_qm)
    db.commit()
    db.refresh(new_qm)

    logger.info(f"Mensagem rápida criada: id={new_qm.id}, atalho='/{clean_shortcut}', client_id={client_id}")
    return new_qm


@router.put("/quick-messages/{message_id}", response_model=QuickMessageOut)
def update_quick_message(
    message_id: int,
    payload: QuickMessageUpdate,
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Atualiza uma mensagem rápida existente."""
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    qm = db.query(models.QuickMessage).filter(
        models.QuickMessage.id == message_id,
        models.QuickMessage.client_id == client_id
    ).first()

    if not qm:
        raise HTTPException(status_code=404, detail="Mensagem rápida não encontrada.")

    if payload.shortcut is not None:
        clean_shortcut = normalize_shortcut(payload.shortcut)
        if not clean_shortcut:
            raise HTTPException(status_code=400, detail="O atalho não pode ser vazio.")

        # Verificar se outro registro já usa esse atalho
        existing = db.query(models.QuickMessage).filter(
            models.QuickMessage.client_id == client_id,
            models.QuickMessage.shortcut == clean_shortcut,
            models.QuickMessage.id != message_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Já existe outra mensagem rápida com o atalho '/{clean_shortcut}'."
            )
        qm.shortcut = clean_shortcut

    if payload.title is not None:
        qm.title = payload.title.strip()

    if payload.content is not None:
        qm.content = payload.content.strip()

    qm.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(qm)

    logger.info(f"Mensagem rápida atualizada: id={qm.id}, client_id={client_id}")
    return qm


@router.delete("/quick-messages/{message_id}")
def delete_quick_message(
    message_id: int,
    client_id: int = Depends(get_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Exclui uma mensagem rápida."""
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido.")

    qm = db.query(models.QuickMessage).filter(
        models.QuickMessage.id == message_id,
        models.QuickMessage.client_id == client_id
    ).first()

    if not qm:
        raise HTTPException(status_code=404, detail="Mensagem rápida não encontrada.")

    db.delete(qm)
    db.commit()

    logger.info(f"Mensagem rápida excluída: id={message_id}, client_id={client_id}")
    return {"success": True, "message": "Mensagem rápida excluída com sucesso."}

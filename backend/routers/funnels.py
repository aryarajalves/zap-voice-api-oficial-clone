from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import SessionLocal
from core.deps import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/funnels", response_model=List[schemas.Funnel], summary="Listar todos os funis")
def list_funnels(
    skip: int = 0, 
    limit: int = 100, 
    x_client_id: Optional[int] = Header(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Retorna uma lista paginada de todos os funis de automação cadastrados.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
    
    funnels = db.query(models.Funnel).filter(
        models.Funnel.client_id == x_client_id
    ).offset(skip).limit(limit).all()
    return funnels

@router.get("/funnels/{funnel_id}", response_model=schemas.Funnel, summary="Obter detalhes de um funil")
def read_funnel(
    funnel_id: int, 
    x_client_id: Optional[int] = Header(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Busca um funil específico pelo seu ID.
    Retorna 404 se não encontrado.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
    
    funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return funnel

@router.post("/funnels", response_model=schemas.Funnel, summary="Criar novo funil")
def create_funnel(
    funnel: schemas.FunnelCreate, 
    x_client_id: Optional[int] = Header(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria um novo funil de automação.
    
    - **name**: Nome interno do funil.
    - **steps**: Lista de passos (mensagens, delays, mídias).
    - **trigger_phrase**: (Opcional) Gatilho de texto exato.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
    
    db_funnel = models.Funnel(
        name=funnel.name, 
        description=funnel.description, 
        steps=[s.dict() for s in funnel.steps], # Convert Pydantic models to dict for JSON storage
        trigger_phrase=funnel.trigger_phrase,
        allowed_phone=funnel.allowed_phone,
        client_id=x_client_id
    )
    db.add(db_funnel)
    db.commit()
    db.refresh(db_funnel)
    return db_funnel

@router.put("/funnels/{funnel_id}", response_model=schemas.Funnel, summary="Atualizar funil existente")
def update_funnel(
    funnel_id: int, 
    funnel_update: schemas.FunnelCreate, 
    x_client_id: Optional[int] = Header(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Atualiza as propriedades e passos de um funil existente.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
    
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    db_funnel.name = funnel_update.name
    db_funnel.description = funnel_update.description
    db_funnel.trigger_phrase = funnel_update.trigger_phrase
    db_funnel.allowed_phone = funnel_update.allowed_phone
    db_funnel.steps = [s.dict() for s in funnel_update.steps]
    db.commit()
    db.refresh(db_funnel)
    return db_funnel

@router.delete("/funnels/{funnel_id}", summary="Excluir funil")
def delete_funnel(
    funnel_id: int, 
    x_client_id: Optional[int] = Header(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Remove permanentemente um funil do sistema.
    """
    if not x_client_id:
        raise HTTPException(status_code=400, detail="Client ID não fornecido (header X-Client-ID)")
    
    db_funnel = db.query(models.Funnel).filter(
        models.Funnel.id == funnel_id,
        models.Funnel.client_id == x_client_id
    ).first()
    if not db_funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    db.delete(db_funnel)
    db.commit()
    return {"message": "Funnel deleted successfully"}

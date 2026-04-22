from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import SessionLocal
from core.deps import get_current_user, get_validated_client_id

router = APIRouter(prefix="/globals", tags=["Globals"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[schemas.GlobalVariable])
def list_globals(
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.GlobalVariable).filter(
        models.GlobalVariable.client_id == x_client_id
    ).all()

@router.post("", response_model=schemas.GlobalVariable)
def create_global(
    var: schemas.GlobalVariableCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if name already exists
    existing = db.query(models.GlobalVariable).filter(
        models.GlobalVariable.client_id == x_client_id,
        models.GlobalVariable.name == var.name
    ).first()
    
    if existing:
        existing.value = var.value
        db.commit()
        db.refresh(existing)
        return existing

    db_var = models.GlobalVariable(
        client_id=x_client_id,
        name=var.name,
        value=var.value
    )
    db.add(db_var)
    db.commit()
    db.refresh(db_var)
    return db_var

@router.put("/{var_id}", response_model=schemas.GlobalVariable)
def update_global(
    var_id: int,
    var: schemas.GlobalVariableCreate,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_var = db.query(models.GlobalVariable).filter(
        models.GlobalVariable.id == var_id,
        models.GlobalVariable.client_id == x_client_id
    ).first()
    
    if not db_var:
        raise HTTPException(status_code=404, detail="Variável não encontrada")
    
    # Check if new name already exists for another ID
    existing = db.query(models.GlobalVariable).filter(
        models.GlobalVariable.client_id == x_client_id,
        models.GlobalVariable.name == var.name,
        models.GlobalVariable.id != var_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma variável com este nome")
        
    db_var.name = var.name
    db_var.value = var.value
    db.commit()
    db.refresh(db_var)
    return db_var

@router.delete("/{var_id}")
def delete_global(
    var_id: int,
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_var = db.query(models.GlobalVariable).filter(
        models.GlobalVariable.id == var_id,
        models.GlobalVariable.client_id == x_client_id
    ).first()
    
    if not db_var:
        raise HTTPException(status_code=404, detail="Variável não encontrada")
    
    db.delete(db_var)
    db.commit()
    return {"message": "Variável excluída com sucesso"}

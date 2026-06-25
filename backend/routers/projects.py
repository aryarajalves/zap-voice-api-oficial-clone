from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import Base
from core.deps import get_db, get_current_user
from core.permissions import require_super_admin
from models import Project, Client, User

router = APIRouter(prefix="/projects", tags=["Projects"])

# Pydantic Schemas
class ClientMinResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str

class ProjectUpdate(BaseModel):
    name: str

class ProjectResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    clients: List[ClientMinResponse] = []

    class Config:
        from_attributes = True

class AssociateClientsRequest(BaseModel):
    client_ids: List[int]


@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna a lista de todos os projetos com seus clientes associados.
    Apenas administradores ou super administradores têm acesso.
    """
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado para o seu nível de permissão."
        )
    return db.query(Project).all()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Cria um novo projeto. Apenas super_admin.
    """
    existing = db.query(Project).filter(Project.name == project_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Projeto com o nome '{project_data.name}' já existe."
        )

    new_project = Project(name=project_data.name)
    db.add(new_project)
    try:
        db.commit()
        db.refresh(new_project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar projeto: {str(e)}")
    return new_project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Atualiza o nome de um projeto. Apenas super_admin.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    existing = db.query(Project).filter(Project.name == project_data.name, Project.id != project_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Projeto com o nome '{project_data.name}' já existe."
        )

    project.name = project_data.name
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Exclui um projeto. Remove o vínculo de projeto de todos os clientes associados.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # Remover vinculo dos clientes
    db.query(Client).filter(Client.project_id == project_id).update({Client.project_id: None})
    db.delete(project)
    db.commit()
    return None


@router.post("/{project_id}/clients", response_model=ProjectResponse)
def associate_clients_to_project(
    project_id: int,
    request_data: AssociateClientsRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Associa ou desassocia clientes (números) a um projeto.
    Qualquer cliente fornecido terá seu project_id atualizado.
    Clientes anteriormente vinculados que não estiverem na lista terão o vínculo removido.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # 1. Limpar vínculo anterior dos clientes que pertenciam ao projeto mas não estão na nova lista
    db.query(Client).filter(
        Client.project_id == project_id,
        ~Client.id.in_(request_data.client_ids)
    ).update({Client.project_id: None}, synchronize_session=False)

    # 2. Vincular os novos clientes ao projeto
    if request_data.client_ids:
        db.query(Client).filter(
            Client.id.in_(request_data.client_ids)
        ).update({Client.project_id: project_id}, synchronize_session=False)

    db.commit()
    db.refresh(project)
    return project

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional, List
import models, schemas
from core.deps import get_current_user, get_db

router = APIRouter()


def _get_client_id(x_client_id: Optional[int], current_user: models.User) -> int:
    return x_client_id if x_client_id else current_user.client_id


@router.get("/folders", response_model=List[schemas.TriggerFolder], summary="Listar Pastas de Disparos")
async def list_trigger_folders(
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = _get_client_id(x_client_id, current_user)

    folders = db.query(models.TriggerFolder).filter(
        models.TriggerFolder.client_id == client_id
    ).order_by(models.TriggerFolder.name.asc()).all()

    counts = dict(
        db.query(models.ScheduledTrigger.folder_id, sqlfunc.count(models.ScheduledTrigger.id))
        .filter(models.ScheduledTrigger.client_id == client_id, models.ScheduledTrigger.folder_id != None)
        .group_by(models.ScheduledTrigger.folder_id)
        .all()
    )

    result = []
    for f in folders:
        f.trigger_count = counts.get(f.id, 0)
        result.append(f)
    return result


@router.post("/folders", response_model=schemas.TriggerFolder, summary="Criar Pasta de Disparos")
async def create_trigger_folder(
    payload: schemas.TriggerFolderCreate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = _get_client_id(x_client_id, current_user)

    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nome da pasta é obrigatório")

    folder = models.TriggerFolder(
        client_id=client_id,
        name=name,
        color=payload.color or "#6366f1"
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    folder.trigger_count = 0
    return folder


@router.patch("/folders/{folder_id}", response_model=schemas.TriggerFolder, summary="Renomear/Recolorir Pasta")
async def update_trigger_folder(
    folder_id: int,
    payload: schemas.TriggerFolderUpdate,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = _get_client_id(x_client_id, current_user)
    folder = db.query(models.TriggerFolder).filter(
        models.TriggerFolder.id == folder_id,
        models.TriggerFolder.client_id == client_id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")

    if payload.name is not None:
        new_name = payload.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Nome da pasta é obrigatório")
        folder.name = new_name
    if payload.color is not None:
        folder.color = payload.color

    db.commit()
    db.refresh(folder)

    folder.trigger_count = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.folder_id == folder.id
    ).count()
    return folder


@router.delete("/folders/{folder_id}", summary="Excluir Pasta de Disparos")
async def delete_trigger_folder(
    folder_id: int,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = _get_client_id(x_client_id, current_user)
    folder = db.query(models.TriggerFolder).filter(
        models.TriggerFolder.id == folder_id,
        models.TriggerFolder.client_id == client_id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")

    # Os disparos voltam a ficar "sem pasta" — não são excluídos.
    db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.folder_id == folder_id
    ).update({"folder_id": None}, synchronize_session=False)

    db.delete(folder)
    db.commit()
    return {"message": "Pasta excluída. Os disparos foram mantidos sem pasta."}


@router.patch("/{trigger_id}/folder", summary="Mover um Disparo para uma Pasta")
async def move_trigger_to_folder(
    trigger_id: int,
    payload: schemas.TriggerFolderMove,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = _get_client_id(x_client_id, current_user)
    trigger = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id == trigger_id,
        models.ScheduledTrigger.client_id == client_id
    ).first()
    if not trigger:
        raise HTTPException(status_code=404, detail="Disparo não encontrado")

    if payload.folder_id is not None:
        folder = db.query(models.TriggerFolder).filter(
            models.TriggerFolder.id == payload.folder_id,
            models.TriggerFolder.client_id == client_id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Pasta não encontrada")

    trigger.folder_id = payload.folder_id
    db.commit()
    return {"id": trigger_id, "folder_id": trigger.folder_id}


@router.post("/bulk-move-folder", summary="Mover múltiplos disparos para uma pasta")
async def bulk_move_triggers_to_folder(
    payload: schemas.TriggerFolderBulkMove,
    x_client_id: Optional[int] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client_id = _get_client_id(x_client_id, current_user)

    if payload.folder_id is not None:
        folder = db.query(models.TriggerFolder).filter(
            models.TriggerFolder.id == payload.folder_id,
            models.TriggerFolder.client_id == client_id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Pasta não encontrada")

    updated = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.id.in_(payload.ids),
        models.ScheduledTrigger.client_id == client_id
    ).update({"folder_id": payload.folder_id}, synchronize_session=False)

    db.commit()
    return {"updated_count": updated, "folder_id": payload.folder_id}

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class TriggerFolderBase(BaseModel):
    name: str = Field(..., description="Nome da pasta")
    color: Optional[str] = Field("#6366f1", description="Cor de identificação da pasta (hex)")


class TriggerFolderCreate(TriggerFolderBase):
    pass


class TriggerFolderUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TriggerFolder(TriggerFolderBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    trigger_count: Optional[int] = Field(0, description="Quantidade de disparos nesta pasta")

    class Config:
        from_attributes = True


class TriggerFolderMove(BaseModel):
    folder_id: Optional[int] = Field(None, description="ID da pasta destino, ou null para remover da pasta")


class TriggerFolderBulkMove(BaseModel):
    ids: List[int] = Field(..., description="Lista de IDs de disparos a mover")
    folder_id: Optional[int] = Field(None, description="ID da pasta destino, ou null para remover da pasta")

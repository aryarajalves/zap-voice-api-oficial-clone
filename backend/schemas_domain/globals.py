from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GlobalVariableBase(BaseModel):
    name: str = Field(..., description="Nome da variável", example="preco_produto")
    value: str = Field(..., description="Valor da variável", example="R$ 97,00")


class GlobalVariableCreate(GlobalVariableBase):
    pass


class GlobalVariable(GlobalVariableBase):
    id: int
    client_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

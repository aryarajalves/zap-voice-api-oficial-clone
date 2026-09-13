from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class CheckoutConfigBase(BaseModel):
    slug: str = Field(..., example="mentoria-vip")
    title: str = Field(default="Aplicação Mentoria", example="Aplicação Mentoria")
    description: Optional[str] = Field(default="Preencha seus dados para continuar com sua aplicação", example="Preencha seus dados para continuar com sua aplicação")
    badge_text: Optional[str] = Field(default="⚡ Vagas Limitadas", example="⚡ Vagas Limitadas")
    destination_url: str = Field(..., example="https://pay.kiwify.com.br/sample")
    tag_name: Optional[str] = Field(default="Checkout Presell", example="Lead Mentoria")
    page_tab_title: Optional[str] = Field(default="Aplicação Mentoria", example="Aplicação Mentoria VIP")
    button_text: Optional[str] = Field(default="Continuar com Aplicação →", example="Continuar com Aplicação →")


class CheckoutConfigCreate(CheckoutConfigBase):
    pass


class CheckoutConfigResponse(CheckoutConfigBase):
    id: int
    client_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CheckoutLeadCreate(BaseModel):
    name: str = Field(..., example="João Silva")
    email: str = Field(..., example="joao@exemplo.com")
    phone: str = Field(..., example="5511999999999")


class CheckoutLeadResponse(BaseModel):
    id: int
    client_id: int
    config_id: int
    name: str
    email: str
    phone: str
    tag_name: Optional[str] = None
    has_chat: Optional[bool] = False
    conversation_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CheckoutLeadListResponse(BaseModel):
    items: List[CheckoutLeadResponse]
    total: int

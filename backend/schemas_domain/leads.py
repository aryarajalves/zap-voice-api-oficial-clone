import json
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class WebhookLeadBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bsud: Optional[str] = None
    email: Optional[str] = None
    last_event_type: Optional[str] = None
    last_event_at: Optional[datetime] = None
    product_name: Optional[str] = None
    platform: Optional[str] = None
    payment_method: Optional[str] = None
    price: Optional[str] = None
    tags: Optional[str] = None
    total_events: int = 1
    last_template_name: Optional[str] = None
    last_template_dispatched_at: Optional[datetime] = None
    is_locked: bool = False
    variables: Optional[Dict[str, Any]] = None
    google_calendar_link: Optional[str] = None
    event_datetime: Optional[datetime] = None
    google_calendar_reminder_sent: Optional[bool] = False
    imported_by_client_id: Optional[int] = None
    imported_by_name: Optional[str] = None
    project_id: Optional[int] = None

    is_really_blocked: bool = False
    resting_expires_at: Optional[datetime] = None
    reminder_dispatch_status: Optional[str] = None
    reminder_dispatch_interaction: Optional[bool] = False
    reminder_dispatch_failure_reason: Optional[str] = None

    @field_validator('variables', mode='before')
    @classmethod
    def parse_variables(cls, v):
        if v is None:
            return {}
        if isinstance(v, dict):
            return v
        if isinstance(v, (list, str)):
            if not v:
                return {}
            if isinstance(v, str):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, dict):
                        return parsed
                except:
                    pass
            return {}
        return {}

    chatwoot_conversation_id: Optional[int] = None
    chatwoot_account_id: Optional[int] = None
    chatwoot_inbox_id: Optional[int] = None
    chatwoot_url: Optional[str] = None

    created_at: datetime
    updated_at: Optional[datetime] = None


class WebhookLead(WebhookLeadBase):
    id: int
    client_id: int

    class Config:
        from_attributes = True


class WebhookLeadCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: str = Field(..., description="Telefone do contato (apenas números)")
    tags: Optional[str] = None


class WebhookLeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[str] = None
    is_locked: Optional[bool] = None
    variables: Optional[Dict[str, Any]] = None
    google_calendar_link: Optional[str] = None
    event_datetime: Optional[datetime] = None
    google_calendar_reminder_sent: Optional[bool] = None
    product_name: Optional[str] = None
    payment_method: Optional[str] = None
    price: Optional[str] = None
    platform: Optional[str] = None


class WebhookLeadPublicUpsert(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    google_calendar_link: Optional[str] = None
    event_datetime: Optional[datetime] = None
    google_calendar_reminder_sent: Optional[bool] = False
    tags: Optional[str] = None
    product_name: Optional[str] = None
    payment_method: Optional[str] = None
    price: Optional[str] = None
    platform: Optional[str] = "public_api"
    variables: Optional[Dict[str, Any]] = None

    class Config:
        extra = "ignore"


class WebhookLeadListResponse(BaseModel):
    items: List[WebhookLead]
    total: int


class HotLead(BaseModel):
    id: int
    client_id: int
    contact_name: Optional[str] = None
    contact_phone: str
    alert_name: str
    priority: str
    context_message: Optional[str] = None
    assigned_user_id: Optional[int] = None
    assigned_user_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HotLeadUpdate(BaseModel):
    priority: Optional[str] = None
    assigned_user_id: Optional[int] = None


class HotLeadListResponse(BaseModel):
    items: List[HotLead]
    total: int

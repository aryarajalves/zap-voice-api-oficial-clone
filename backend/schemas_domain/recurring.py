from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any, Dict
from datetime import datetime


class RecurringTriggerBase(BaseModel):
    frequency: str = Field(..., description="'weekly' or 'monthly'", example="weekly")
    days_of_week: Optional[List[dict]] = Field(None, description="e.g. [{'day': 0, 'time': '09:00'}]")
    day_of_month: Optional[List[Any]] = Field(None, description="e.g. [1, 15] ou [{'day': 1, 'time': '10:00'}]")
    scheduled_time: Optional[str] = Field(None, description="HH:mm em UTC (fallback)", example="09:00")

    funnel_id: Optional[int] = None
    template_name: Optional[str] = None
    template_language: str = "pt_BR"
    template_components: Optional[List[dict]] = None

    contacts_list: Optional[List[Any]] = None
    tag: Optional[str] = None
    exclusion_list: Optional[List[str]] = None
    exclusion_tags: Optional[List[str]] = None
    exclusion_tag_mode: Optional[str] = "OR"

    delay_seconds: int = 5
    concurrency_limit: int = 1

    private_message: Optional[str] = None
    private_message_delay: int = 5
    private_message_concurrency: int = 1

    direct_message: Optional[str] = None
    direct_message_params: Optional[List[dict]] = None

    is_active: bool = True
    button_actions: Optional[Dict[str, Any]] = None

    @field_validator('button_actions', mode='before')
    @classmethod
    def parse_button_actions(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, list):
            if not v:
                return {}
            return {}
        if isinstance(v, str):
            v_trimmed = v.strip()
            if not v_trimmed:
                return {}
            try:
                import json
                parsed = json.loads(v_trimmed)
                if isinstance(parsed, dict):
                    return parsed
            except:
                pass
            return {}
        return {}


class RecurringTriggerUpdate(BaseModel):
    frequency: Optional[str] = None
    days_of_week: Optional[List[dict]] = None
    day_of_month: Optional[List[Any]] = None
    scheduled_time: Optional[str] = None
    is_active: Optional[bool] = None
    direct_message: Optional[str] = None
    direct_message_params: Optional[List[dict]] = None

    template_name: Optional[str] = None
    template_language: Optional[str] = None
    template_components: Optional[List[dict]] = None
    funnel_id: Optional[int] = None
    exclusion_list: Optional[List[str]] = None
    exclusion_tags: Optional[List[str]] = None
    exclusion_tag_mode: Optional[str] = None
    button_actions: Optional[Dict[str, Any]] = None


class RecurringTriggerCreate(RecurringTriggerBase):
    pass


class RecurringTrigger(RecurringTriggerBase):
    id: int
    client_id: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecurringEventListResponse(BaseModel):
    items: List[RecurringTrigger]
    total: int

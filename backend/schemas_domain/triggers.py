import json
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any, Union, Dict
from datetime import datetime

from .funnels import Funnel
from .folders import TriggerFolder


class ScheduledTriggerBase(BaseModel):
    funnel_id: Optional[int] = Field(None, description="ID do funil a ser executado")
    conversation_id: Optional[int] = Field(None, description="ID da conversa no Chatwoot")
    scheduled_time: Optional[datetime] = Field(None, description="Data/Hora agendada para execução")
    max_dispatch_time: Optional[datetime] = Field(None, description="Data/Hora limite para envio/expiração do disparo")
    status: str = Field("pending", description="Status do agendamento (pending, queued, processing, completed, cancelled, failed)")
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None


class ScheduledTrigger(ScheduledTriggerBase):
    id: int
    created_at: datetime
    funnel: Optional[Funnel] = None
    interaction_funnel_id: Optional[int] = None
    block_funnel_id: Optional[int] = None
    interaction_funnel: Optional[Funnel] = None
    block_funnel: Optional[Funnel] = None
    waba_card_last4: Optional[str] = Field(None, description="Últimos 4 dígitos do cartão de crédito WABA vinculado")

    # Bulk send fields
    is_bulk: bool = Field(False, description="Indica se faz parte de um envio em massa")
    template_name: Optional[str] = Field(None, description="Nome do template WhatsApp (se aplicável)")
    template_category: Optional[str] = Field(None, description="Categoria do template: MARKETING, UTILITY ou AUTHENTICATION")
    private_message: Optional[str] = Field(None, description="Mensagem privada para o Chatwoot")
    private_message_delay: int = 5
    private_message_concurrency: int = 1
    total_sent: int = 0
    total_failed: int = 0
    total_contacts: int = 0
    contacts_list: Optional[List[Union[dict, str]]] = Field(None, description="Lista de contatos alvo (para validação)")
    delay_seconds: int = Field(5, description="Intervalo entre envios (bulk)")
    concurrency_limit: int = 1
    cost_per_unit: float = 0.0
    total_cost: float = 0.0
    total_delivered: int = 0
    total_read: int = 0
    total_interactions: int = 0
    total_blocked: int = 0
    total_skipped: int = 0
    queue_count: Optional[int] = 0
    total_memory_sent: int = 0

    # New Field
    current_step_index: Optional[int] = Field(0, description="Índice do último passo executado no funil")
    current_node_id: Optional[str] = Field(None, description="ID do nó atual no grafo")
    label_added: bool = False
    publish_external_event: bool = False
    processed_contacts: Optional[List[str]] = []
    pending_contacts: Optional[List[str]] = []
    failure_reason: Optional[str] = None
    event_type: Optional[str] = None
    integration_id: Optional[str] = None
    is_free_message: bool = False
    is_interaction: bool = False
    skip_block_check: bool = False
    is_followup: bool = Field(False, description="Indica se é um disparo de follow-up")
    followup_status: Optional[str] = Field(None, description="Status do disparo de follow-up associado")
    followup_scheduled_time: Optional[datetime] = Field(None, description="Horário de disparo do follow-up associado")
    sent_as: Optional[str] = None
    is_recurring: bool = Field(False, description="Indica se faz parte de uma recorrência")
    recurring_trigger_id: Optional[int] = Field(None, description="ID da recorrência de origem")
    chatwoot_label: Optional[List[str]] = Field(default_factory=list)
    button_actions: Optional[Dict[str, Any]] = None
    funnel_snapshot: Optional[Union[dict, list]] = None
    processed_data: Optional[Dict[str, Any]] = None
    is_stress_test: bool = Field(False, description="Indica se é um disparo de teste de escala (dry-run)")
    is_pinned: Optional[bool] = Field(False, description="Fixado no topo do histórico de disparos")
    folder_id: Optional[int] = Field(None, description="ID da pasta em que o disparo está organizado")
    folder: Optional[TriggerFolder] = Field(None, description="Pasta em que o disparo está organizado")
    chatwoot_contact_id: Optional[int] = Field(None, description="ID do contato no Chatwoot")
    chatwoot_account_id: Optional[int] = Field(None, description="ID da conta no Chatwoot")
    chatwoot_inbox_id: Optional[int] = Field(None, description="ID do inbox no Chatwoot")
    is_dynamic_label: Optional[bool] = Field(False, description="Indica se o agendamento re-consulta contatos da etiqueta no momento do disparo")
    dynamic_label_name: Optional[str] = Field(None, description="Nome da etiqueta a ser re-consultada no disparo")
    is_contact_blocked: Optional[bool] = Field(False, description="Indica se o telefone do contato está na lista de bloqueados")

    @field_validator('is_pinned', 'is_dynamic_label', mode='before')
    @classmethod
    def parse_boolean_fields(cls, v):
        if v is None:
            return False
        return bool(v)

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
                parsed = json.loads(v_trimmed)
                if isinstance(parsed, dict):
                    return parsed
            except:
                pass
            return {}
        return {}

    @field_validator('chatwoot_label', mode='before')
    @classmethod
    def parse_chatwoot_label(cls, v):
        from core.utils import robust_extract_labels
        return robust_extract_labels(v)

    @field_validator('processed_data', mode='before')
    @classmethod
    def parse_processed_data(cls, v):
        if v is None:
            return {}
        if isinstance(v, dict):
            return v
        if isinstance(v, list):
            return {}
        if isinstance(v, str):
            v_trimmed = v.strip()
            if not v_trimmed:
                return {}
            try:
                parsed = json.loads(v_trimmed)
                if isinstance(parsed, dict):
                    return parsed
            except:
                pass
            return {}
        return {}

    updated_at: Optional[datetime] = None

    # Nested Funnels
    parent_id: Optional[int] = None
    child_count: Optional[int] = 0
    interaction_child_count: Optional[int] = 0
    block_child_count: Optional[int] = 0
    total_private_notes: Optional[int] = 0
    total_paid_templates: int = 0
    chatwoot_url: Optional[str] = None
    execution_history: Optional[List[dict]] = []
    queue_count: Optional[int] = None

    @field_validator('integration_id', mode='before')
    @classmethod
    def coerce_integration_id(cls, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True


class BulkDeleteRequest(BaseModel):
    ids: List[int] = Field(..., description="Lista de IDs para exclusão em massa")


class UpdateTriggerParamsRequest(BaseModel):
    delay_seconds: Optional[int] = None
    concurrency_limit: Optional[int] = None
    contacts_list: Optional[List[Any]] = None
    scheduled_time: Optional[datetime] = None


class MessageStatus(BaseModel):
    id: int
    trigger_id: int
    message_id: Optional[str] = None
    phone_number: str
    status: str
    failure_reason: Optional[str] = None
    is_interaction: bool = False
    message_type: Optional[str] = None
    meta_price_category: Optional[str] = None
    meta_price_brl: Optional[float] = None
    content: Optional[str] = None
    timestamp: datetime
    updated_at: Optional[datetime] = None

    # AI Memory Status
    memory_webhook_status: Optional[str] = None
    memory_webhook_error: Optional[str] = None

    # Redirecionamento Chatwoot
    chatwoot_conversation_id: Optional[int] = None
    chatwoot_account_id: Optional[int] = None
    chatwoot_inbox_id: Optional[int] = None
    chatwoot_url: Optional[str] = None

    class Config:
        from_attributes = True


class TriggerStats(BaseModel):
    total_dispatches: int
    delivered: int
    delivered_pct: float
    read: int
    read_pct: float
    interactions: int
    interactions_pct: float
    total_cost: float


class TriggerListResponse(BaseModel):
    items: List[ScheduledTrigger]
    total: int
    stats: Optional[TriggerStats] = None
    distinct_templates: Optional[List[str]] = None

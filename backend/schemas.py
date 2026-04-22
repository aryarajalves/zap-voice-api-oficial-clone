from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any, Union, Dict
from datetime import datetime
from uuid import UUID
import json

# --- Enums & Sub-models ---

class FunnelStep(BaseModel):
    type: str = Field(..., description="Tipo do passo (message, audio, video, image, delay)", example="message")
    content: Optional[str] = Field(None, description="Conteúdo da mensagem ou URL da mídia", example="Olá! Como posso ajudar?")
    # Delay options
    delay: Optional[int] = Field(0, description="Tempo de espera (se type=delay)", example=5)
    timeUnit: Optional[str] = Field("seconds", description="Unidade de tempo (seconds, minutes, hours, days)", example="seconds")
    # Typing options
    simulate_typing: Optional[bool] = Field(False, description="Simular 'digitando...' antes de enviar")
    typing_time: Optional[int] = Field(3, description="Tempo simulando digitação (segundos)")
    # Interactive options
    interactive: Optional[bool] = Field(False, description="Se verdadeiro, envia botões interativos (Meta API)")
    buttons: Optional[List[str]] = Field(None, description="Lista de textos para botões", example=["Sim", "Não"])
    # Private options
    privateMessageEnabled: Optional[bool] = Field(False, description="Enviar nota interna no Chatwoot após este passo")
    privateMessageContent: Optional[str] = Field(None, description="Conteúdo da nota interna")
    # File options
    fileName: Optional[str] = Field(None, description="Nome personalizado para o arquivo enviado", example="comprovante.pdf")

# --- Funnel Schemas ---

class FunnelBase(BaseModel):
    name: str = Field(..., description="Nome de identificação do funil", example="Funil de Boas Vindas")
    description: Optional[str] = Field(None, description="Descrição opcional para uso interno")
    trigger_phrase: Optional[str] = Field(None, description="Frase exata que dispara este funil (Match exato)", example="#start")
    allowed_phones: Optional[List[str]] = Field(None, description="Lista de telefones permitidos (Whitelist)")
    blocked_phones: Optional[List[str]] = Field(None, description="Lista de telefones bloqueados (Blacklist)")
    allowed_phone: Optional[str] = Field(None, description="Legado: apenas este número pode disparar", example="5511999999999")
    steps: Union[List[Any], dict] = Field(..., description="Lista sequencial de passos ou Grafo do Flow Builder")
    # Horário Comercial (para filtro nos nós com onlyBusinessHours=true)
    business_hours_start: Optional[str] = Field("08:00", description="Horário de início do período comercial (HH:MM, America/Sao_Paulo)", example="08:00")
    business_hours_end: Optional[str] = Field("18:00", description="Horário de fim do período comercial (HH:MM, America/Sao_Paulo)", example="18:00")
    business_hours_days: Optional[List[int]] = Field(default=[0,1,2,3,4], description="Dias da semana com horário comercial (0=Seg, 6=Dom)")

class FunnelCreate(FunnelBase):
    pass

class Funnel(FunnelBase):
    id: int = Field(..., description="ID único do funil no banco de dados")

    class Config:
        from_attributes = True

class FunnelBulkDelete(BaseModel):
    funnel_ids: List[int] = Field(..., description="Lista de IDs de funis para excluir")

# --- Trigger Schemas ---

class ScheduledTriggerBase(BaseModel):
    funnel_id: Optional[int] = Field(None, description="ID do funil a ser executado")
    conversation_id: Optional[int] = Field(None, description="ID da conversa no Chatwoot")
    scheduled_time: datetime = Field(..., description="Data/Hora agendada para execução")
    status: str = Field(..., description="Status do agendamento (pending, queued, processing, completed, cancelled, failed)")
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None

class ScheduledTrigger(ScheduledTriggerBase):
    id: int
    created_at: datetime
    funnel: Optional[Funnel] = None
    
    # Bulk send fields
    is_bulk: bool = Field(False, description="Indica se faz parte de um envio em massa")
    template_name: Optional[str] = Field(None, description="Nome do template WhatsApp (se aplicável)")
    private_message: Optional[str] = Field(None, description="Mensagem privada para o Chatwoot")
    private_message_delay: int = 5
    private_message_concurrency: int = 1
    total_sent: int = 0
    total_failed: int = 0
    contacts_list: Optional[List[Union[dict, str]]] = Field(None, description="Lista de contatos alvo (para validação)")
    delay_seconds: int = Field(5, description="Intervalo entre envios (bulk)")
    concurrency_limit: int = 1
    cost_per_unit: float = 0.0
    total_cost: float = 0.0
    total_delivered: int = 0
    total_read: int = 0
    total_interactions: int = 0
    total_blocked: int = 0
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
    sent_as: Optional[str] = None  # Resultado real: 'FREE_MESSAGE' (grátis) ou 'TEMPLATE' (pago)
    chatwoot_label: Optional[List[str]] = Field(default_factory=list)
    updated_at: Optional[datetime] = None
    
    # Nested Funnels
    parent_id: Optional[int] = None
    child_count: Optional[int] = 0
    total_private_notes: Optional[int] = 0
    total_paid_templates: int = 0
    chatwoot_account_id: Optional[int] = None
    chatwoot_contact_id: Optional[int] = None
    chatwoot_inbox_id: Optional[int] = None
    execution_history: Optional[List[dict]] = []

    @field_validator('integration_id', mode='before')
    @classmethod
    def coerce_integration_id(cls, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True

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

# --- Recurring Trigger Schemas ---

class RecurringEventListResponse(BaseModel):
    items: List['RecurringTrigger']
    total: int

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
    
    delay_seconds: int = 5
    concurrency_limit: int = 1
    
    private_message: Optional[str] = None
    private_message_delay: int = 5
    private_message_concurrency: int = 1

    direct_message: Optional[str] = None
    direct_message_params: Optional[List[dict]] = None

    is_active: bool = True

class RecurringTriggerUpdate(BaseModel):
    frequency: Optional[str] = None
    days_of_week: Optional[List[dict]] = None
    day_of_month: Optional[List[Any]] = None
    scheduled_time: Optional[str] = None
    is_active: Optional[bool] = None
    direct_message: Optional[str] = None
    direct_message_params: Optional[List[dict]] = None

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

class TriggerListResponse(BaseModel):
    items: List[ScheduledTrigger]
    total: int

# --- WhatsApp Schemas ---

class WhatsAppTemplateRequest(BaseModel):
    phone_number: str = Field(..., description="Número de destino (formato internacional sem +)", example="5511999999999")
    template_name: str = Field(..., description="Nome do template aprovado na Meta", example="hello_world")
    language: Optional[str] = Field("pt_BR", description="Código do idioma", example="pt_BR")
    components: Optional[List[dict]] = Field(
        default=[], 
        description="Componentes para substituir variáveis {{1}}, {{2}}...", 
        example=[
            {
                "type": "body", 
                "parameters": [
                    {"type": "text", "text": "João"},
                    {"type": "text", "text": "1234"}
                ]
            }
        ]
    )
class WhatsAppTemplateCreate(BaseModel):
    name: str = Field(..., description="Nome do template (apenas letras minúsculas e underscores)", example="boas_vindas_campanha")
    category: str = Field("MARKETING", description="Categoria (MARKETING ou UTILITY)", example="MARKETING")
    language: str = Field("pt_BR", description="Idioma do template", example="pt_BR")
    header_type: Optional[str] = Field("NONE", description="Tipo de cabeçalho: NONE, TEXT, IMAGE, VIDEO, DOCUMENT")
    header_text: Optional[str] = Field(None, description="Texto do cabeçalho (se header_type=TEXT)")
    header_media_url: Optional[str] = Field(None, description="Link de exemplo para mídia (IMAGE, VIDEO, DOCUMENT)")
    body_text: str = Field(..., description="Texto do corpo da mensagem (suporta variáveis {{1}}, {{2}}...)")
    footer_text: Optional[str] = Field(None, description="Texto do rodapé")
    buttons: Optional[List[dict]] = Field(default=[], description="Lista de botões [{type: 'QUICK_REPLY', text: 'Sim'}]")
# --- Global Variable Schemas ---

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

# --- Webhook Integration Schemas ---

class WebhookEventMappingBase(BaseModel):
    event_type: str = Field(..., description="Tipo do evento (ex: pix_gerado, compra_aprovada)")
    product_name: Optional[str] = Field(None, description="Filtrar por nome do produto / curso")
    template_id: Optional[Union[str, int]] = Field(None, description="ID do template (BigInt da Meta)")
    template_name: Optional[str] = Field(None, description="Nome do template")
    delay_minutes: Optional[int] = Field(0, description="Minutos de atraso")
    delay_seconds: Optional[int] = Field(0, description="Segundos de atraso")
    variables_mapping: Optional[dict] = Field({}, description="Mapeamento de variáveis {{1}}: 'nome'")
    private_note: Optional[str] = Field(None, description="Nota interna para criação na conversa (Chatwoot)")
    cancel_events: Optional[List[str]] = Field(None, description="Eventos a cancelar quando este dispara")
    chatwoot_label: Optional[List[str]] = Field(default_factory=list, description="Lista de etiquetas a serem adicionadas na conversa (Chatwoot)")
    internal_tags: Optional[str] = Field(None, description="Etiquetas internas do contato (ZapVoice)")
    publish_external_event: Optional[bool] = Field(False, description="Publicar evento externo (RabbitMQ) no ato da entrega")
    send_as_free_message: Optional[bool] = Field(False, description="Se verdadeiro, envia como mensagem livre (sessão)")
    funnel_id: Optional[int] = Field(None, description="ID do funil a ser disparado")
    template_language: Optional[str] = Field("pt_BR", description="Idioma do template")
    template_components: Optional[List[dict]] = Field(None, description="Componentes dinâmicos do template")
    trigger_once: Optional[bool] = Field(False, description="Disparar apenas uma vez por contato/integração/evento")
    manychat_active: Optional[bool] = Field(False, description="Sincronizar contato com ManyChat")
    manychat_name: Optional[str] = Field(None, description="Campo dinâmico nome ManyChat")
    manychat_phone: Optional[str] = Field(None, description="Campo dinâmico telefone ManyChat")
    manychat_tag: Optional[str] = Field(None, description="Tag para adicionar no ManyChat")
    manychat_tag_automation: Optional[bool] = Field(False, description="Ativar automação de tag dinâmica")
    manychat_tag_prefix: Optional[str] = Field(None, description="Prefixo da tag dinâmica")
    manychat_tag_rotation_time: Optional[str] = Field("08:00", description="Horário de rotação (HH:mm)")
    manychat_tag_rotation_day: Optional[int] = Field(4, description="Dia da semana da rotação (0-6)")
    is_active: Optional[bool] = Field(True, description="Indica se o mapeamento está ativo")

    @field_validator('chatwoot_label', mode='before')
    @classmethod
    def validate_list_or_string(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v_trimmed = v.strip()
            if not v_trimmed:
                return []
            if v_trimmed.startswith('['):
                try:
                    return json.loads(v_trimmed)
                except:
                    return [v_trimmed]
            return [v_trimmed]
        return []

    @field_validator('cancel_events', mode='before')
    @classmethod
    def validate_cancel_events(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v_trimmed = v.strip()
            if not v_trimmed:
                return []
            if v_trimmed.startswith('['):
                try:
                    return json.loads(v_trimmed)
                except:
                    return [v_trimmed]
            return [v_trimmed]
        return []

class WebhookEventMappingCreate(WebhookEventMappingBase):
    pass

class WebhookEventMapping(WebhookEventMappingBase):
    id: int
    integration_id: UUID
    
    class Config:
        from_attributes = True

class WebhookIntegrationBase(BaseModel):
    name: str = Field(..., description="Nome da integração")
    platform: str = Field(..., description="Plataforma (hotmart, eduzz, etc)")
    status: Optional[str] = Field("active")
    custom_fields_mapping: Optional[dict] = Field({}, description="Mapeamento de campos customizados {nome_campo: caminho_json}")
    custom_slug: Optional[str] = Field(None, description="Slug personalizado para a URL do webhook (ex: minha-loja-hotmart)")
    product_filtering: Optional[bool] = Field(False, description="Ativar filtragem por produto")
    product_whitelist: Optional[List[str]] = Field(default_factory=list, description="Lista de produtos permitidos")
    discovered_products: Optional[List[str]] = Field(default_factory=list, description="Lista de produtos descobertos no histórico")

class WebhookIntegrationCreate(WebhookIntegrationBase):
    mappings: Optional[List[WebhookEventMappingCreate]] = []

class WebhookIntegration(WebhookIntegrationBase):
    id: UUID
    client_id: int
    created_at: datetime
    mappings: List[WebhookEventMapping] = []

    class Config:
        from_attributes = True

class WebhookHistoryBase(BaseModel):
    payload: dict
    event_type: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    processed_data: Optional[dict] = None
    created_at: datetime

class WebhookHistory(WebhookHistoryBase):
    id: int
    integration_id: UUID
    
    class Config:
        from_attributes = True

# --- Webhook Lead Schemas ---

class WebhookLeadBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    last_event_type: Optional[str] = None
    last_event_at: Optional[datetime] = None
    product_name: Optional[str] = None
    platform: Optional[str] = None
    payment_method: Optional[str] = None
    price: Optional[str] = None
    tags: Optional[str] = None
    total_events: int = 1
    
    # Redirecionamento Chatwoot
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

class WebhookLeadListResponse(BaseModel):
    items: List[WebhookLead]
    total: int

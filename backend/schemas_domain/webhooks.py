import json
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Union, Dict, Any
from datetime import datetime
from uuid import UUID


class WebhookEventMappingBase(BaseModel):
    event_type: str = Field(..., description="Tipo do evento (ex: pix_gerado, compra_aprovada)")
    product_name: Optional[str] = Field(None, description="Filtrar por nome do produto / curso")
    template_id: Optional[Union[str, int]] = Field(None, description="ID do template (BigInt da Meta)")
    template_name: Optional[str] = Field(None, description="Nome do template")
    delay_minutes: Optional[int] = Field(0, description="Minutos de atraso")
    delay_seconds: Optional[int] = Field(0, description="Segundos de atraso")
    variables_mapping: Optional[Union[dict, list]] = Field(default_factory=list, description="Mapeamento de variáveis {{1}}: 'nome' ou lista de objetos")
    private_note: Optional[str] = Field(None, description="Nota interna para criação na conversa (Chatwoot)")
    cancel_events: Optional[List[str]] = Field(None, description="Eventos a cancelar quando este dispara (Legado)")
    cancel_pending_on_trigger: Optional[bool] = Field(False, description="Ativar interrupção inteligente")
    cancel_event_types: Optional[List[str]] = Field(None, description="Tipos de eventos a cancelar")
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
    manychat_start_date: Optional[datetime] = Field(None, description="Data de início para a etiqueta alternativa")
    manychat_tag_alternative: Optional[str] = Field(None, description="Etiqueta alternativa a aplicar a partir da data de início")
    manychat_tag_automation: Optional[bool] = Field(False, description="Ativar automação de tag dinâmica")
    manychat_tag_include_date: Optional[bool] = Field(True, description="Incluir data DD-MM-YYYY na etiqueta")
    manychat_tag_prefix: Optional[str] = Field(None, description="Prefixo da tag dinâmica")
    manychat_tag_rotation_time: Optional[str] = Field("08:00", description="Horário de rotação (HH:mm)")
    manychat_tag_rotation_day: Optional[int] = Field(4, description="Dia da semana da rotação (0-6)")

    followup_active: Optional[bool] = Field(False, description="Ativar mensagem de follow-up")
    followup_template_name: Optional[str] = Field(None, description="Nome do template de follow-up")
    followup_template_id: Optional[Union[str, int]] = Field(None, description="ID do template de follow-up")
    followup_delay_value: Optional[int] = Field(0, description="Valor do atraso do follow-up")
    followup_delay_unit: Optional[str] = Field("minutes", description="Unidade do atraso do follow-up (minutes, hours)")
    followup_variables_mapping: Optional[Union[dict, list]] = Field(default_factory=list, description="Mapeamento de variáveis do template de follow-up")
    followup_business_hours_active: Optional[bool] = Field(False, description="Ativar restrição de horário comercial para o follow-up")
    followup_business_hours_start: Optional[str] = Field("08:00", description="Horário inicial comercial do follow-up")
    followup_business_hours_end: Optional[str] = Field("18:00", description="Horário final comercial do follow-up")
    followup_business_hours_days: Optional[List[int]] = Field(default_factory=lambda: [0, 1, 2, 3, 4], description="Dias da semana permitidos para o follow-up")

    update_contact_on_trigger: Optional[bool] = Field(True, description="Atualizar/criar contato na aba Contatos quando o gatilho disparar")
    contact_save_fields: Optional[List[str]] = Field(None, description="Campos a salvar no contato (None = padrão)")
    button_actions: Optional[Dict[str, Any]] = Field(None, description="Ações de botões do template")
    is_active: Optional[bool] = Field(True, description="Indica se o mapeamento está ativo")

    @field_validator('button_actions', mode='before')
    @classmethod
    def parse_button_actions_mapping(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, list):
            return {}
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v

    @field_validator('funnel_id', 'template_id', 'followup_template_id', mode='before')
    @classmethod
    def coerce_empty_string_to_none(cls, v):
        if v == "" or str(v).strip().lower() in ["none", "null", "undefined"]:
            return None
        return v

    @field_validator('chatwoot_label', mode='before')
    @classmethod
    def validate_list_or_string(cls, v):
        from core.utils import robust_extract_labels
        return robust_extract_labels(v)

    @field_validator('cancel_event_types', mode='before')
    @classmethod
    def validate_cancel_event_types(cls, v):
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
    upsell_products: Optional[List[str]] = Field(default_factory=list, description="Lista de produtos que devem ser tratados como Upsell")


class WebhookIntegrationCreate(WebhookIntegrationBase):
    mappings: Optional[List[WebhookEventMappingCreate]] = []


class WebhookIntegration(WebhookIntegrationBase):
    id: UUID
    client_id: int
    created_at: datetime
    mappings: List[WebhookEventMapping] = []
    history_count: Optional[int] = 0

    class Config:
        from_attributes = True


class WebhookHistoryBase(BaseModel):
    payload: dict
    event_type: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    processed_data: Optional[dict] = None
    duplicate_count: int = 0
    created_at: datetime


class WebhookHistory(WebhookHistoryBase):
    id: int
    integration_id: UUID

    class Config:
        from_attributes = True

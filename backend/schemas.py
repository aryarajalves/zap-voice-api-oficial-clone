"""
ZapVoice - Central de Schemas Pydantic.
Módulo orquestrador e ponto de entrada compatível para validação de dados da API.
A lógica detalhada de cada domínio está dividida em `schemas_domain/`.
"""

from schemas_domain import (
    # Funnels
    FunnelStep,
    FunnelBase,
    FunnelCreate,
    Funnel,
    FunnelBulkDelete,
    FunnelBulkArchive,
    FunnelBulkTag,
    # Folders
    TriggerFolderBase,
    TriggerFolderCreate,
    TriggerFolderUpdate,
    TriggerFolder,
    TriggerFolderMove,
    TriggerFolderBulkMove,
    # Triggers
    ScheduledTriggerBase,
    ScheduledTrigger,
    BulkDeleteRequest,
    UpdateTriggerParamsRequest,
    MessageStatus,
    TriggerStats,
    TriggerListResponse,
    # Recurring
    RecurringTriggerBase,
    RecurringTriggerUpdate,
    RecurringTriggerCreate,
    RecurringTrigger,
    RecurringEventListResponse,
    # WhatsApp
    WhatsAppTemplateRequest,
    WhatsAppTemplateCreate,
    TemplateTagsUpdate,
    # Globals
    GlobalVariableBase,
    GlobalVariableCreate,
    GlobalVariable,
    # Webhooks
    WebhookEventMappingBase,
    WebhookEventMappingCreate,
    WebhookEventMapping,
    WebhookIntegrationBase,
    WebhookIntegrationCreate,
    WebhookIntegration,
    WebhookHistoryBase,
    WebhookHistory,
    # Leads
    WebhookLeadBase,
    WebhookLead,
    WebhookLeadCreate,
    WebhookLeadUpdate,
    WebhookLeadPublicUpsert,
    WebhookLeadListResponse,
    HotLead,
    HotLeadUpdate,
    HotLeadListResponse,
    # Checkout
    CheckoutConfigBase,
    CheckoutConfigCreate,
    CheckoutConfigResponse,
    CheckoutLeadCreate,
    CheckoutLeadResponse,
    CheckoutLeadListResponse,
)

__all__ = [
    # Funnels
    "FunnelStep",
    "FunnelBase",
    "FunnelCreate",
    "Funnel",
    "FunnelBulkDelete",
    "FunnelBulkArchive",
    "FunnelBulkTag",
    # Folders
    "TriggerFolderBase",
    "TriggerFolderCreate",
    "TriggerFolderUpdate",
    "TriggerFolder",
    "TriggerFolderMove",
    "TriggerFolderBulkMove",
    # Triggers
    "ScheduledTriggerBase",
    "ScheduledTrigger",
    "BulkDeleteRequest",
    "UpdateTriggerParamsRequest",
    "MessageStatus",
    "TriggerStats",
    "TriggerListResponse",
    # Recurring
    "RecurringTriggerBase",
    "RecurringTriggerUpdate",
    "RecurringTriggerCreate",
    "RecurringTrigger",
    "RecurringEventListResponse",
    # WhatsApp
    "WhatsAppTemplateRequest",
    "WhatsAppTemplateCreate",
    "TemplateTagsUpdate",
    # Globals
    "GlobalVariableBase",
    "GlobalVariableCreate",
    "GlobalVariable",
    # Webhooks
    "WebhookEventMappingBase",
    "WebhookEventMappingCreate",
    "WebhookEventMapping",
    "WebhookIntegrationBase",
    "WebhookIntegrationCreate",
    "WebhookIntegration",
    "WebhookHistoryBase",
    "WebhookHistory",
    # Leads
    "WebhookLeadBase",
    "WebhookLead",
    "WebhookLeadCreate",
    "WebhookLeadUpdate",
    "WebhookLeadPublicUpsert",
    "WebhookLeadListResponse",
    "HotLead",
    "HotLeadUpdate",
    "HotLeadListResponse",
    # Checkout
    "CheckoutConfigBase",
    "CheckoutConfigCreate",
    "CheckoutConfigResponse",
    "CheckoutLeadCreate",
    "CheckoutLeadResponse",
    "CheckoutLeadListResponse",
]

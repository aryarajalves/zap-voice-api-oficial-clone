from sqlalchemy import Table, Column, Integer, String, JSON, DateTime, ForeignKey, Boolean, Float, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import relationship, backref
import uuid

# Association table for User-Client Many-to-Many relationship
user_clients = Table(
    "user_clients",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("client_id", Integer, ForeignKey("clients.id"), primary_key=True)
)

class Client(Base):
    """Multi-tenancy: Each client has isolated funnels, settings, etc."""
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships

    funnels = relationship("Funnel", back_populates="client")
    triggers = relationship("ScheduledTrigger", back_populates="client")
    configs = relationship("AppConfig", back_populates="client")
    blocked_contacts = relationship("BlockedContact", back_populates="client")
    webhooks = relationship("WebhookConfig", back_populates="client")
    # New relationship for contact windows
    contact_windows = relationship("ContactWindow", back_populates="client")
    recurring_triggers = relationship("RecurringTrigger", back_populates="client")


class WebhookConfig(Base):
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    funnel_id = Column(Integer, ForeignKey("funnels.id"), nullable=False)
    
    name = Column(String, nullable=False) # Ex: Hotmart Vendas
    slug = Column(String, unique=True, index=True, nullable=False) # Token único da URL
    
    # Configuração de Mapeamento (JSON)
    # Ex: { "phone_field": "buyer.checkout_phone", "name_field": "buyer.full_name" }
    field_mapping = Column(JSON, default={}) 
    
    # URL para onde encaminhar a requisição (ex: n8n, make)
    forward_url = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    total_received = Column(Integer, default=0)
    total_processed = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    last_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Guarda o último payload recebido para debug/exemplo
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    
    # NOVOS CAMPOS: Delay de Disparo
    delay_amount = Column(Integer, default=0) # Valor do delay (ex: 5)
    delay_unit = Column(String, default="seconds") # Unidade (seconds, minutes, hours)

    # Relacionamentos
    client = relationship("Client", back_populates="webhooks")
    funnel = relationship("Funnel")
    events = relationship("WebhookEvent", back_populates="webhook", cascade="all, delete-orphan")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, ForeignKey("webhook_configs.id"), nullable=False, index=True)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    headers = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    external_id = Column(String, unique=True, index=True, nullable=True) # ID from provider (Chatwoot/Meta)
    status = Column(String, default="pending")  # pending, processed, failed
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    retry_count = Column(Integer, default=0)
    processed_data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Dados extraídos (phone, name, vars)

    webhook = relationship("WebhookConfig", back_populates="events")


class Funnel(Base):
    __tablename__ = "funnels"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    steps = Column(JSON) # Lista de dicionários: [{"type": "message", "content": "olá", "delay": 2}]
    trigger_phrase = Column(String, nullable=True) # Gatilho para início automático (botão/webhook)
    allowed_phone = Column(String, nullable=True) # Legacy support (singular)
    allowed_phones = Column(JSON, nullable=True) # Lista de telefones permitidos (Whitelist)
    blocked_phones = Column(JSON, nullable=True) # Lista de telefones bloqueados (Blacklist)

    # Horário Comercial: Define o período em que os nós com "onlyBusinessHours" podem enviar.
    # Formato: "HH:MM" em horário de Brasília (America/Sao_Paulo)
    business_hours_start = Column(String, nullable=True, default="08:00")  # Ex: "08:00"
    business_hours_end = Column(String, nullable=True, default="18:00")    # Ex: "18:00"
    business_hours_days = Column(JSON, nullable=True, default=lambda: [0,1,2,3,4])  # 0=Seg, 6=Dom

    client = relationship("Client", back_populates="funnels")
    triggers = relationship("ScheduledTrigger", back_populates="funnel")

class ScheduledTrigger(Base):
    __tablename__ = "scheduled_triggers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    funnel_id = Column(Integer, ForeignKey("funnels.id"))
    conversation_id = Column(Integer)
    chatwoot_contact_id = Column(BigInteger, nullable=True)
    chatwoot_account_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), index=True)
    status = Column(String, default="pending") # pending, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    product_name = Column(String, nullable=True)  # Nome do produto vinculado a este disparo
    
    # Bulk template send tracking
    is_bulk = Column(Boolean, default=False)
    template_name = Column(String, nullable=True)
    total_sent = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    contacts_list = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # List of phone numbers
    delay_seconds = Column(Integer, default=5)
    concurrency_limit = Column(Integer, default=1)
    template_language = Column(String, default="pt_BR")
    template_components = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Dynamic variables for template
    private_message = Column(String, nullable=True) # Private message to be sent after template
    private_message_delay = Column(Integer, default=5)
    private_message_concurrency = Column(Integer, default=1)
    
    # Direct Message Configuration (24h Window Open)
    direct_message = Column(String, nullable=True) 
    direct_message_params = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    
    
    # Cost tracking
    cost_per_unit = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    total_delivered = Column(Integer, default=0)  # Count of actually delivered messages
    total_read = Column(Integer, default=0)       # Count of read messages
    total_interactions = Column(Integer, default=0) # Count of button clicks
    total_paid_templates = Column(Integer, default=0) # Specifically for billable templates
    total_blocked = Column(Integer, default=0)    # Count of users who requested block
    total_memory_sent = Column(Integer, default=0) # Count of successful AI Memory syncs
    total_private_notes = Column(Integer, default=0) # Count of successful Chatwoot private notes
    execution_history = Column(JSON().with_variant(JSONB, "postgresql"), default=list) # Detailed node-by-node log
    
    # Contact tracking for cancellation
    processed_contacts = Column(JSON().with_variant(JSONB, "postgresql"), default=list)  # List of phone numbers already processed
    pending_contacts = Column(JSON().with_variant(JSONB, "postgresql"), default=list)    # List of phone numbers still to process
    current_step_index = Column(Integer, default=0)  # Legacy Step Index
    current_node_id = Column(String, nullable=True)  # Graph Node ID
    failure_reason = Column(String, nullable=True)  # Detailed reason if status is 'failed'
    label_added = Column(Boolean, default=False)  # Refined Label Strategy
    publish_external_event = Column(Boolean, default=False) # RabbitMQ External Event
    chatwoot_label = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Lista de etiquetas a serem adicionadas na conversa do Chatwoot
    idempotency_key = Column(String, nullable=True, index=True) # Chave para evitar disparos duplicados (ex: Meta + Chatwoot)

    # Webhook Integration reference (set when triggered by a webhook integration)
    event_type = Column(String, nullable=True) # Ex: compra_aprovada, pix_gerado
    integration_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    is_free_message = Column(Boolean, default=False) # Se True, envia como mensagem de sessão (Interactive)
    is_interaction = Column(Boolean, default=False) # Se True, indica que foi disparado por uma interação do usuário (ex: botão)
    skip_block_check = Column(Boolean, default=False) # Se True, evita que o motor aborte se o contato estiver bloqueado
    sent_as = Column(String, nullable=True)  # Resultado real do envio: 'FREE_MESSAGE' (grátis) ou 'TEMPLATE' (pago)
    
    # Nested Funnels support
    parent_id = Column(Integer, ForeignKey("scheduled_triggers.id", ondelete="CASCADE"), nullable=True, index=True)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="triggers")
    funnel = relationship("Funnel", back_populates="triggers")
    messages = relationship("MessageStatus", back_populates="trigger", cascade="all, delete-orphan")
    
    # Self-referencial relationship for hierarchy
    children = relationship("ScheduledTrigger", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")

class MessageStatus(Base):
    """Track individual message delivery status from WhatsApp webhooks"""
    __tablename__ = "message_status"
    
    id = Column(Integer, primary_key=True, index=True)
    trigger_id = Column(Integer, ForeignKey("scheduled_triggers.id", ondelete="CASCADE"), index=True)
    message_id = Column(String, unique=True, index=True)  # WhatsApp message ID
    phone_number = Column(String)
    status = Column(String, default="sent")  # sent, delivered, read, failed, interaction
    failure_reason = Column(String, nullable=True) # Detailed error message from Meta
    is_interaction = Column(Boolean, default=False) # True if it was a button click
    message_type = Column(String, nullable=True)   # TEMPLATE or FREE_MESSAGE
    meta_price_category = Column(String, nullable=True)  # marketing, utility, service, authentication (from Meta webhook)
    meta_price_brl = Column(Float, nullable=True)         # Custo real em BRL detectado automaticamente
    content = Column(Text, nullable=True)
    pending_private_note = Column(String, nullable=True) # Note to be sent upon 'delivered' status
    private_note_posted = Column(Boolean, default=False)
    
    # NOVAS COLUNAS: Persistência de variáveis imutáveis (1 a 5)
    var1 = Column(String, nullable=True)
    var2 = Column(String, nullable=True)
    var3 = Column(String, nullable=True)
    var4 = Column(String, nullable=True)
    var5 = Column(String, nullable=True)
    
    template_name = Column(String, nullable=True) # Nome do template utilizado neste disparo individual
    
    # AI Memory Webhook Tracking
    memory_webhook_status = Column(String, nullable=True) # pending, sent, failed, not_configured
    memory_webhook_error = Column(String, nullable=True)
    
    # NOVOS CAMPOS: Redirecionamento Chatwoot
    chatwoot_conversation_id = Column(Integer, nullable=True)
    chatwoot_account_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True)
    
    delivered_counted = Column(Boolean, default=False) # To avoid duplicate increments in Parent Trigger
    
    # NEW: Persist if memory was enabled for this specific message in Graph Funnel
    publish_external_event = Column(Boolean, default=False)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    trigger = relationship("ScheduledTrigger", back_populates="messages")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user") # super_admin, admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    accessible_clients = relationship("Client", secondary=user_clients, backref="users_with_access")
    client = relationship("Client", backref="users_in_this_client")

class AppConfig(Base):
    """
    Armazena configurações dinâmicas do sistema (ex: Credenciais WhatsApp/Chatwoot).
    Substitui a necessidade de reiniciar para ler variáveis de ambiente.
    """
    __tablename__ = "app_config"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    key = Column(String, index=True, nullable=False)
    value = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client", back_populates="configs")

class BlockedContact(Base):
    __tablename__ = "blocked_contacts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    phone = Column(String, index=True, nullable=False)
    name = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="blocked_contacts")


class ContactWindow(Base):
    """
    Cache das interações de 24h para evitar consultas excessivas ao Chatwoot.
    """
    __tablename__ = "contact_windows"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    phone = Column(String, index=True, nullable=False) # Número do cliente (normalizado)
    chatwoot_contact_name = Column(String, nullable=True)
    chatwoot_conversation_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True) # Importante: uma mesma pessoa pode estar em diferentes inboxes
    
    last_interaction_at = Column(DateTime(timezone=True), nullable=False) # Data da última msg INCOMING
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client", back_populates="contact_windows")


class WebhookIntegration(Base):
    """
    Integração Externa (Hotmart, Eduzz, etc) para disparar Templates Meta
    """
    __tablename__ = "webhook_integrations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    platform = Column(String, nullable=False)  # 'hotmart', 'eduzz', 'monetizze', etc.
    status = Column(String, default="active")  # 'active' or 'inactive'
    custom_fields_mapping = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Custom fields mapped by the user
    # Slug personalizado: permite URLs mais legíveis (ex: /webhooks/external/minha-loja-hotmart)
    custom_slug = Column(String, nullable=True, index=True, unique=True)
    
    # NEW: Product Filtering
    product_filtering = Column(Boolean, default=False)
    product_whitelist = Column(JSON().with_variant(JSONB, "postgresql"), default=list) # List of product names allowed
    discovered_products = Column(JSON().with_variant(JSONB, "postgresql"), default=list) # List of unique products seen in history
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", backref="webhook_integrations")
    mappings = relationship("WebhookEventMapping", back_populates="integration", cascade="all, delete-orphan", order_by="WebhookEventMapping.id")
    history = relationship("WebhookHistory", back_populates="integration", cascade="all, delete-orphan")


class WebhookEventMapping(Base):
    """
    Mapeamento de Eventos de Webhook para Templates/Funnels
    """
    __tablename__ = "webhook_event_mappings"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(PG_UUID(as_uuid=True), ForeignKey("webhook_integrations.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)  # e.g. 'PURCHASE_COMPLETE', 'PURCHASE_CANCELED'
    product_name = Column(String, nullable=True) # Optional: filter by specific product (Overload)
    template_id = Column(BigInteger, nullable=True)
    template_name = Column(String, nullable=True)
    template_language = Column(String, default="pt_BR")
    template_components = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    funnel_id = Column(Integer, ForeignKey("funnels.id"), nullable=True)
    delay_minutes = Column(Integer, default=0)
    delay_seconds = Column(Integer, default=0)
    private_note = Column(String, nullable=True)
    variables_mapping = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    cancel_events = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    chatwoot_label = Column(String, nullable=True) # Fisicamente é VARCHAR no banco
    internal_tags = Column(String, nullable=True) # New field for internal contact tags
    publish_external_event = Column(Boolean, default=False)
    send_as_free_message = Column(Boolean, default=False) # Se True, tenta enviar como mensagem livre (sessão)
    trigger_once = Column(Boolean, default=False) # Se True, dispara apenas uma vez por contato/integração/evento
    
    # ManyChat Integration
    manychat_active = Column(Boolean, default=False)
    manychat_name = Column(String, nullable=True) # Dynamic field (ex: {{name}})
    manychat_phone = Column(String, nullable=True) # Dynamic field (ex: {{phone}})
    manychat_tag = Column(String, nullable=True) # Tag to add in ManyChat
    
    # NEW Dynamic Tag Rotation fields
    manychat_tag_automation = Column(Boolean, default=False)
    manychat_tag_prefix = Column(String, nullable=True) # e.g. workshop-semanal
    manychat_tag_rotation_time = Column(String, default="08:00")
    manychat_tag_rotation_day = Column(Integer, default=4) # 0=Segunda, 4=Sexta, 6=Domingo
    
    is_active = Column(Boolean, default=True)
    cost_per_message = Column(Float, default=0.0)  # Custo por mensagem em BRL (para tracking de gastos)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    integration = relationship("WebhookIntegration", back_populates="mappings")
    funnel = relationship("Funnel")


class WebhookHistory(Base):
    """
    Histórico de Webhooks Recebidos
    """
    __tablename__ = "webhook_history"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(PG_UUID(as_uuid=True), ForeignKey("webhook_integrations.id"), nullable=False, index=True)
    event_type = Column(String, nullable=True)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    processed_data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    status = Column(String, default="received")  # received, processed, failed, skipped
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    integration = relationship("WebhookIntegration", back_populates="history")

class WhatsAppTemplateCache(Base):
    """
    Cache de Templates do WhatsApp (Meta API)
    """
    __tablename__ = "whatsapp_template_cache"

    id = Column(BigInteger, primary_key=True) # Meta Template ID
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True)
    language = Column(String)
    body = Column(Text, nullable=True)
    components = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class GlobalVariable(Base):
    """
    Variáveis globais que podem ser usadas em funis (ex: {{var:nome}})
    """
    __tablename__ = "global_variables"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True, nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client")

class WebhookLead(Base):
    """
    Agrega contatos recebidos por webhook de integração para exibição em lista.
    Mantém o "status principal" do lead em tempo real.
    """
    __tablename__ = "webhook_leads"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String, index=True)
    
    last_event_type = Column(String) # ex: compra_aprovada, pix_gerado
    last_event_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product_name = Column(String)
    platform = Column(String) # hotmart, eduzz, etc
    payment_method = Column(String)
    price = Column(String)
    tags = Column(String, nullable=True) # Etiquetas (chatwoot_label) acumuladas
    
    total_events = Column(Integer, default=1)
    
    # NOVOS CAMPOS: Redirecionamento Chatwoot
    chatwoot_conversation_id = Column(Integer, nullable=True)
    chatwoot_account_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client")


class RecurringTrigger(Base):
    """
    Configuração de disparos recorrentes (Semanal/Mensal).
    """
    __tablename__ = "recurring_triggers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Payload de Disparo (Clonado do ScheduledTrigger)
    funnel_id = Column(Integer, ForeignKey("funnels.id"), nullable=True)
    template_name = Column(String, nullable=True)
    template_language = Column(String, default="pt_BR")
    template_components = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    
    contacts_list = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Lista estática (opcional)
    tag = Column(String, nullable=True) # Tag dinâmica (opcional)
    exclusion_list = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    
    delay_seconds = Column(Integer, default=5)
    concurrency_limit = Column(Integer, default=1)
    
    private_message = Column(String, nullable=True)
    private_message_delay = Column(Integer, default=5)
    private_message_concurrency = Column(Integer, default=1)

    direct_message = Column(String, nullable=True)
    direct_message_params = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    # Recurrence Settings
    frequency = Column(String, nullable=False) # 'weekly', 'monthly'
    days_of_week = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # [{"day": 0, "time": "09:00"}]
    day_of_month = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # [1, 15, 30]
    scheduled_time = Column(String, nullable=True) # "HH:mm" - Fallback se individual não existir
    
    # Status & Flow
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), index=True, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client", back_populates="recurring_triggers")
    funnel = relationship("Funnel")
class StatusInfo(Base):
    __tablename__ = "status_info"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, nullable=False, index=True)
    webhook_id = Column(Integer, nullable=True)
    phone = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    status = Column(String, nullable=True)
    trigger_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ProductStatus(Base):
    __tablename__ = "product_status"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, nullable=False, index=True)
    phone = Column(String, nullable=False, index=True)
    customer_name = Column(String, nullable=True)
    product_name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    last_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

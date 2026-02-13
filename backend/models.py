from sqlalchemy import Table, Column, Integer, String, JSON, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import relationship

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
    last_payload = Column(JSON, nullable=True) # Guarda o último payload recebido para debug/exemplo
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
    payload = Column(JSON, nullable=False)
    headers = Column(JSON, nullable=True)
    status = Column(String, default="pending")  # pending, processed, failed
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    retry_count = Column(Integer, default=0)
    processed_data = Column(JSON, nullable=True) # Dados extraídos (phone, name, vars)

    webhook = relationship("WebhookConfig", back_populates="events")


class Funnel(Base):
    __tablename__ = "funnels"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    steps = Column(JSON) # Lista de dicionários: [{"type": "message", "content": "olá", "delay": 2}]
    trigger_phrase = Column(String, nullable=True) # Gatilho para início automático (botão/webhook)
    allowed_phone = Column(String, nullable=True) # Restrição de telefone (só dispara para este número se definido)

    client = relationship("Client", back_populates="funnels")
    triggers = relationship("ScheduledTrigger", back_populates="funnel")

class ScheduledTrigger(Base):
    __tablename__ = "scheduled_triggers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    funnel_id = Column(Integer, ForeignKey("funnels.id"))
    conversation_id = Column(Integer)
    scheduled_time = Column(DateTime(timezone=True), index=True)
    status = Column(String, default="pending") # pending, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    
    # Bulk template send tracking
    is_bulk = Column(Boolean, default=False)
    template_name = Column(String, nullable=True)
    total_sent = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    contacts_list = Column(JSON, nullable=True)  # List of phone numbers
    delay_seconds = Column(Integer, default=5)
    concurrency_limit = Column(Integer, default=1)
    template_language = Column(String, default="pt_BR")
    template_components = Column(JSON, nullable=True) # Dynamic variables for template
    private_message = Column(String, nullable=True) # Private message to be sent after template
    private_message_delay = Column(Integer, default=5)
    private_message_concurrency = Column(Integer, default=1)
    
    # Direct Message Configuration (24h Window Open)
    direct_message = Column(String, nullable=True) 
    direct_message_params = Column(JSON, nullable=True)
    
    
    # Cost tracking
    cost_per_unit = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    total_delivered = Column(Integer, default=0)  # Count of actually delivered messages
    total_read = Column(Integer, default=0)       # Count of read messages
    total_interactions = Column(Integer, default=0) # Count of button clicks
    total_blocked = Column(Integer, default=0)    # Count of users who requested block
    
    # Contact tracking for cancellation
    processed_contacts = Column(JSON, default=list)  # List of phone numbers already processed
    pending_contacts = Column(JSON, default=list)    # List of phone numbers still to process
    current_step_index = Column(Integer, default=0)  # Legacy Step Index
    current_node_id = Column(String, nullable=True)  # Graph Node ID
    failure_reason = Column(String, nullable=True)  # Detailed reason if status is 'failed'
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="triggers")
    funnel = relationship("Funnel", back_populates="triggers")
    messages = relationship("MessageStatus", back_populates="trigger")

class MessageStatus(Base):
    """Track individual message delivery status from WhatsApp webhooks"""
    __tablename__ = "message_status"
    
    id = Column(Integer, primary_key=True, index=True)
    trigger_id = Column(Integer, ForeignKey("scheduled_triggers.id"), index=True)
    message_id = Column(String, unique=True, index=True)  # WhatsApp message ID
    phone_number = Column(String)
    status = Column(String, default="sent")  # sent, delivered, read, failed, interaction
    failure_reason = Column(String, nullable=True) # Detailed error message from Meta
    is_interaction = Column(Boolean, default=False) # True if it was a button click
    message_type = Column(String, nullable=True)   # TEMPLATE or DIRECT_MESSAGE
    pending_private_note = Column(String, nullable=True) # Note to be sent upon 'delivered' status
    private_note_posted = Column(Boolean, default=False)
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

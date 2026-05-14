from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Float, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base
import uuid

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
    status = Column(String, default="pending") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    
    is_bulk = Column(Boolean, default=False)
    template_name = Column(String, nullable=True)
    total_sent = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    total_contacts = Column(Integer, default=0)
    contacts_list = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    delay_seconds = Column(Integer, default=5)
    concurrency_limit = Column(Integer, default=1)
    template_language = Column(String, default="pt_BR")
    template_components = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    private_message = Column(String, nullable=True)
    private_message_delay = Column(Integer, default=5)
    private_message_concurrency = Column(Integer, default=1)
    
    direct_message = Column(String, nullable=True) 
    direct_message_params = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    
    cost_per_unit = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    total_delivered = Column(Integer, default=0)
    total_read = Column(Integer, default=0)
    total_interactions = Column(Integer, default=0)
    total_paid_templates = Column(Integer, default=0)
    total_blocked = Column(Integer, default=0)
    total_memory_sent = Column(Integer, default=0)
    total_private_notes = Column(Integer, default=0)
    execution_history = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    
    processed_contacts = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    pending_contacts = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    current_step_index = Column(Integer, default=0)
    current_node_id = Column(String, nullable=True)
    failure_reason = Column(String, nullable=True)
    label_added = Column(Boolean, default=False)
    publish_external_event = Column(Boolean, default=False)
    chatwoot_label = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    idempotency_key = Column(String, nullable=True, index=True, unique=True)

    event_type = Column(String, nullable=True)
    integration_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    is_free_message = Column(Boolean, default=False)
    is_interaction = Column(Boolean, default=False)
    skip_block_check = Column(Boolean, default=False)
    sent_as = Column(String, nullable=True)
    
    parent_id = Column(Integer, ForeignKey("scheduled_triggers.id", ondelete="CASCADE"), nullable=True, index=True)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="triggers")
    funnel = relationship("Funnel", back_populates="triggers")
    messages = relationship("MessageStatus", back_populates="trigger", cascade="all, delete-orphan")
    children = relationship("ScheduledTrigger", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")

class MessageStatus(Base):
    __tablename__ = "message_status"
    
    id = Column(Integer, primary_key=True, index=True)
    trigger_id = Column(Integer, ForeignKey("scheduled_triggers.id", ondelete="CASCADE"), index=True)
    message_id = Column(String, unique=True, index=True)
    phone_number = Column(String)
    status = Column(String, default="sent")
    failure_reason = Column(String, nullable=True)
    is_interaction = Column(Boolean, default=False)
    message_type = Column(String, nullable=True)
    meta_price_category = Column(String, nullable=True)
    meta_price_brl = Column(Float, nullable=True)
    content = Column(Text, nullable=True)
    pending_private_note = Column(String, nullable=True)
    private_note_posted = Column(Boolean, default=False)
    
    var1 = Column(String, nullable=True)
    var2 = Column(String, nullable=True)
    var3 = Column(String, nullable=True)
    var4 = Column(String, nullable=True)
    var5 = Column(String, nullable=True)
    
    template_name = Column(String, nullable=True)
    
    memory_webhook_status = Column(String, nullable=True)
    memory_webhook_error = Column(String, nullable=True)
    
    chatwoot_conversation_id = Column(Integer, nullable=True)
    chatwoot_account_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True)
    
    delivered_counted = Column(Boolean, default=False)
    read_counted = Column(Boolean, default=False)
    interaction_counted = Column(Boolean, default=False)
    
    publish_external_event = Column(Boolean, default=False)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    trigger = relationship("ScheduledTrigger", back_populates="messages")

class WebhookIntegration(Base):
    __tablename__ = "webhook_integrations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    status = Column(String, default="active")
    custom_fields_mapping = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    custom_slug = Column(String, nullable=True, index=True, unique=True)
    
    product_filtering = Column(Boolean, default=False)
    product_whitelist = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    discovered_products = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", backref="webhook_integrations")
    mappings = relationship("WebhookEventMapping", back_populates="integration", cascade="all, delete-orphan", order_by="WebhookEventMapping.id")
    history = relationship("WebhookHistory", back_populates="integration", cascade="all, delete-orphan")

class WebhookEventMapping(Base):
    __tablename__ = "webhook_event_mappings"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(PG_UUID(as_uuid=True), ForeignKey("webhook_integrations.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    product_name = Column(String, nullable=True)
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
    cancel_pending_on_trigger = Column(Boolean, default=False)
    cancel_event_types = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    chatwoot_label = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    internal_tags = Column(String, nullable=True)
    publish_external_event = Column(Boolean, default=False)
    send_as_free_message = Column(Boolean, default=False)
    trigger_once = Column(Boolean, default=False)
    
    manychat_active = Column(Boolean, default=False)
    manychat_name = Column(String, nullable=True)
    manychat_phone = Column(String, nullable=True)
    manychat_tag = Column(String, nullable=True)
    
    manychat_tag_automation = Column(Boolean, default=False)
    manychat_tag_include_date = Column(Boolean, default=True)
    manychat_tag_prefix = Column(String, nullable=True)
    manychat_tag_rotation_time = Column(String, default="08:00")
    manychat_tag_rotation_day = Column(Integer, default=4)
    
    is_active = Column(Boolean, default=True)
    cost_per_message = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    integration = relationship("WebhookIntegration", back_populates="mappings")
    funnel = relationship("Funnel")

class WebhookHistory(Base):
    __tablename__ = "webhook_history"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(PG_UUID(as_uuid=True), ForeignKey("webhook_integrations.id"), nullable=False, index=True)
    event_type = Column(String, nullable=True)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    processed_data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    status = Column(String, default="received")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    integration = relationship("WebhookIntegration", back_populates="history")

class WhatsAppTemplateCache(Base):
    __tablename__ = "whatsapp_template_cache"

    id = Column(BigInteger, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True)
    language = Column(String)
    body = Column(Text, nullable=True)
    components = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class GlobalVariable(Base):
    __tablename__ = "global_variables"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True, nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client")

class WebhookLead(Base):
    __tablename__ = "webhook_leads"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String, index=True)
    
    last_event_type = Column(String)
    last_event_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product_name = Column(String)
    platform = Column(String)
    payment_method = Column(String)
    price = Column(String)
    tags = Column(String, nullable=True)
    
    total_events = Column(Integer, default=1)
    
    chatwoot_conversation_id = Column(Integer, nullable=True)
    chatwoot_account_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client")

class RecurringTrigger(Base):
    __tablename__ = "recurring_triggers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    funnel_id = Column(Integer, ForeignKey("funnels.id"), nullable=True)
    template_name = Column(String, nullable=True)
    template_language = Column(String, default="pt_BR")
    template_components = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    
    contacts_list = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    tag = Column(String, nullable=True)
    exclusion_list = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    
    delay_seconds = Column(Integer, default=5)
    concurrency_limit = Column(Integer, default=1)
    
    private_message = Column(String, nullable=True)
    private_message_delay = Column(Integer, default=5)
    private_message_concurrency = Column(Integer, default=1)

    direct_message = Column(String, nullable=True)
    direct_message_params = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    frequency = Column(String, nullable=False)
    days_of_week = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    day_of_month = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    scheduled_time = Column(String, nullable=True)
    
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

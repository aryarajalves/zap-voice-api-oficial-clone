from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Funnel(Base):
    __tablename__ = "funnels"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    steps = Column(JSON) 
    trigger_phrase = Column(String, nullable=True)
    allowed_phone = Column(String, nullable=True)
    allowed_phones = Column(JSON, nullable=True)
    blocked_phones = Column(JSON, nullable=True)

    business_hours_start = Column(String, nullable=True, default="08:00")
    business_hours_end = Column(String, nullable=True, default="18:00")
    business_hours_days = Column(JSON, nullable=True, default=lambda: [0,1,2,3,4])

    client = relationship("Client", back_populates="funnels")
    triggers = relationship("ScheduledTrigger", back_populates="funnel")

class WebhookConfig(Base):
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    funnel_id = Column(Integer, ForeignKey("funnels.id"), nullable=False)
    
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    
    field_mapping = Column(JSON, default={}) 
    forward_url = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    total_received = Column(Integer, default=0)
    total_processed = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    last_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    
    delay_amount = Column(Integer, default=0)
    delay_unit = Column(String, default="seconds")

    client = relationship("Client", back_populates="webhooks")
    funnel = relationship("Funnel")
    events = relationship("WebhookEvent", back_populates="webhook", cascade="all, delete-orphan")

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, ForeignKey("webhook_configs.id"), nullable=False, index=True)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    headers = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    external_id = Column(String, unique=True, index=True, nullable=True)
    status = Column(String, default="pending")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    retry_count = Column(Integer, default=0)
    processed_data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    webhook = relationship("WebhookConfig", back_populates="events")

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Client(Base):
    """Multi-tenancy: Each client has isolated funnels, settings, etc."""
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    funnels = relationship("Funnel", back_populates="client", cascade="all, delete-orphan")
    triggers = relationship("ScheduledTrigger", back_populates="client", cascade="all, delete-orphan")
    configs = relationship("AppConfig", back_populates="client", cascade="all, delete-orphan")
    blocked_contacts = relationship("BlockedContact", back_populates="client", cascade="all, delete-orphan")
    webhooks = relationship("WebhookConfig", back_populates="client", cascade="all, delete-orphan")
    contact_windows = relationship("ContactWindow", back_populates="client", cascade="all, delete-orphan")
    recurring_triggers = relationship("RecurringTrigger", back_populates="client", cascade="all, delete-orphan")


class AppConfig(Base):
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
    __tablename__ = "contact_windows"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    phone = Column(String, index=True, nullable=False)
    chatwoot_contact_name = Column(String, nullable=True)
    chatwoot_conversation_id = Column(Integer, nullable=True)
    chatwoot_inbox_id = Column(Integer, nullable=True)
    
    last_interaction_at = Column(DateTime(timezone=True), nullable=False)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client", back_populates="contact_windows")

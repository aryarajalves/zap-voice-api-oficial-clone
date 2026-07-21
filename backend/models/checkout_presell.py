from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class CheckoutConfig(Base):
    """Configuração da página de captura / checkout presell do cliente."""
    __tablename__ = "checkout_configs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False, default="Aplicação Mentoria")
    description = Column(Text, nullable=True, default="Preencha seus dados para continuar com sua aplicação")
    badge_text = Column(String, nullable=True, default="⚡ Vagas Limitadas")
    destination_url = Column(String, nullable=False, default="https://whatsapp.com")
    tag_name = Column(String, nullable=True, default="Checkout Presell")
    page_tab_title = Column(String, nullable=True, default="Aplicação Mentoria")
    button_text = Column(String, nullable=True, default="Continuar com Aplicação →")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    leads = relationship("CheckoutLead", back_populates="config", cascade="all, delete-orphan")


class CheckoutLead(Base):
    """Leads capturados através da página de checkout presell."""
    __tablename__ = "checkout_leads"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("checkout_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False, index=True)
    tag_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    config = relationship("CheckoutConfig", back_populates="leads")

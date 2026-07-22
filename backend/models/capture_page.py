from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class CapturePageConfig(Base):
    __tablename__ = "capture_page_configs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String(100), nullable=False, index=True, default="masterclass")
    
    # Textos da Página de Captura
    headline = Column(String(200), default="INTENSIVO")
    badge_text = Column(String(200), default="Aulas do Miguel")
    badge_status = Column(String(100), default="AO VIVO")
    event_date = Column(String(200), default="Hoje, 21 de Dezembro, às 20h")
    main_title = Column(String(250), default="VOCÊ ESTÁ QUASE LÁ!")
    main_description = Column(Text, default="Cadastre seu melhor email para receber o link de acesso e garantir sua vaga no intensivo.")
    email_placeholder = Column(String(150), default="Seu melhor email")
    button_text = Column(String(150), default="QUERO PARTICIPAR DO INTENSIVO!")
    bg_image_url = Column(Text, nullable=True)
    footer_note = Column(String(250), default="Seus dados estão seguros. Não enviamos spam.")

    # Textos e Link da Página de Obrigado
    thank_you_title = Column(String(250), default="Inscrição Confirmada!")
    thank_you_description = Column(Text, default="Entre no grupo VIP do WhatsApp para receber o link de acesso e os materiais exclusivos.")
    whatsapp_group_url = Column(String(500), default="https://chat.whatsapp.com/")
    whatsapp_button_text = Column(String(150), default="ENTRAR NO GRUPO DO WHATSAPP")

    # Atribuição de Tag
    tag_name = Column(String(100), default="Página de Captura")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    leads = relationship("CapturePageLead", back_populates="config", cascade="all, delete-orphan")


class CapturePageLead(Base):
    __tablename__ = "capture_page_leads"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("capture_page_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    email = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    config = relationship("CapturePageConfig", back_populates="leads")

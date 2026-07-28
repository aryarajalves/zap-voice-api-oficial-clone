from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from models.base import Base

class EmailConfig(Base):
    __tablename__ = "email_configs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), default="ses", nullable=False)  # 'ses', 'resend', 'smtp'
    
    # Amazon SES credentials
    aws_access_key_id = Column(String(255), nullable=True)
    aws_secret_access_key = Column(String(255), nullable=True)
    aws_region = Column(String(50), default="us-east-1", nullable=True)

    # Resend credentials
    resend_api_key = Column(String(255), nullable=True)

    # SMTP credentials
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, default=587, nullable=True)
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    smtp_encryption = Column(String(20), default="tls", nullable=True)  # 'tls', 'ssl', 'none'

    # Sender info
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class EmailDispatch(Base):
    __tablename__ = "email_dispatches"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    tag_name = Column(String(255), nullable=True)  # Etiqueta da Aba de Contatos
    status = Column(String(50), default="queued", nullable=False)  # 'queued', 'processing', 'completed', 'failed', 'cancelled'
    
    total_contacts = Column(Integer, default=0)
    total_sent = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    
    scheduled_time = Column(DateTime, nullable=True)
    contacts_list = Column(JSON, nullable=True)
    failure_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class EmailInbound(Base):
    __tablename__ = "email_inbounds"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    dispatch_id = Column(Integer, ForeignKey("email_dispatches.id", ondelete="SET NULL"), nullable=True)
    lead_id = Column(Integer, ForeignKey("webhook_leads.id", ondelete="SET NULL"), nullable=True)

    from_email = Column(String(255), nullable=False, index=True)
    from_name = Column(String(255), nullable=True)
    to_email = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    body_text = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)

    provider = Column(String(50), default="generic", nullable=True)  # 'resend', 'ses', 'brevo', 'generic'
    is_read = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from models.base import Base


class BackupConfig(Base):
    """Configuração de backup automático do banco de dados."""
    __tablename__ = "backup_config"

    id = Column(Integer, primary_key=True, index=True)

    # Agendamento
    enabled = Column(Boolean, default=False, nullable=False)
    # "manual", "hours", "days"
    interval_type = Column(String(20), default="manual", nullable=False)
    interval_value = Column(Integer, default=24, nullable=False)  # Ex: 24 horas ou 7 dias

    # Retenção
    retention_count = Column(Integer, default=30, nullable=False)  # Máximo de backups a manter

    # Tracking
    last_backup_at = Column(DateTime(timezone=True), nullable=True)
    next_backup_at = Column(DateTime(timezone=True), nullable=True)
    last_backup_filename = Column(Text, nullable=True)
    last_backup_status = Column(String(50), nullable=True)  # "success", "error"
    last_backup_error = Column(Text, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BackupMetadata(Base):
    """Metadados customizados para os backups (pinar, etiquetar)."""
    __tablename__ = "backup_metadata"

    filename = Column(String(255), primary_key=True, index=True)
    is_pinned = Column(Boolean, default=False, nullable=False)
    tag = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Float, JSON, PrimaryKeyConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base

class DispatchLog(Base):
    __tablename__ = "dispatch_logs"
    __table_args__ = (
        Index("ix_dispatch_logs_client_created", "client_id", "created_at"),
        Index("ix_dispatch_logs_status_created", "status", "created_at"),
        Index("ix_dispatch_logs_trigger_created", "trigger_id", "created_at"),
        {"postgresql_partition_by": "RANGE (created_at)"}
    )

    id = Column(BigInteger, primary_key=True)
    client_id = Column(Integer, nullable=False, index=True)
    trigger_id = Column(Integer, nullable=True, index=True)
    channel = Column(String, nullable=False, default="whatsapp_official")
    recipient = Column(String, nullable=False)
    status = Column(String, nullable=False, default="sent")
    response_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=dict)
    error_message = Column(String, nullable=True)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), primary_key=True, server_default=func.now(), nullable=False)

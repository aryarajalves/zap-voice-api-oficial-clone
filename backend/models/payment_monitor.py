from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from .base import Base

class WabaPaymentCheck(Base):
    __tablename__ = "waba_payment_checks"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    status = Column(String(50), default="HEALTHY", nullable=False)  # HEALTHY, PAYMENT_ISSUE, WARNING, UNAVAILABLE
    check_type = Column(String(20), default="AUTOMATIC", nullable=False)  # AUTOMATIC, MANUAL
    account_review_status = Column(String(50), nullable=True)
    currency = Column(String(10), nullable=True)
    payment_method_status = Column(String(100), nullable=True)
    credit_line_status = Column(String(100), nullable=True)
    has_error = Column(Boolean, default=False, nullable=False)
    details = Column(Text, nullable=True)
    raw_data = Column(Text, nullable=True)

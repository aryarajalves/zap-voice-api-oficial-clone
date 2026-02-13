from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base, engine
from sqlalchemy.orm import relationship

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

    webhook = relationship("WebhookConfig", backref="events")

# Create table directly
Base.metadata.create_all(bind=engine)
print("WebhookEvent table created successfully.")

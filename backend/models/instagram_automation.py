from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class InstagramAutomation(Base):
    __tablename__ = "instagram_automations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    
    # Trigger configurations
    post_id = Column(String, nullable=False, default="all")  # Instagram post ID or "all"
    trigger_type = Column(String, nullable=False, default="keyword")  # "keyword" or "any_comment"
    keywords = Column(String, nullable=True)  # Comma-separated trigger words
    
    # Actions
    action_type = Column(String, nullable=False, default="both")  # "reply_comment", "send_dm", "both"
    reply_comments = Column(JSON, nullable=False, default=list)  # List of possible comment response variations
    funnel_id = Column(Integer, ForeignKey("funnels.id"), nullable=True)  # Target funnel to launch in DMs
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client = relationship("Client")
    funnel = relationship("Funnel")

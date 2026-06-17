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

class InstagramLog(Base):
    __tablename__ = "instagram_logs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    instagram_username = Column(String, nullable=True)
    instagram_user_id = Column(String, nullable=True)
    post_id = Column(String, nullable=True)
    comment_id = Column(String, nullable=True)
    comment_text = Column(String, nullable=True)
    
    status = Column(String, nullable=False, default="no_match")  # "success", "no_match", "error"
    actions_taken = Column(String, nullable=True)  # ex: "Respondeu comentário e iniciou funil 'Campanha 1'"
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client = relationship("Client")

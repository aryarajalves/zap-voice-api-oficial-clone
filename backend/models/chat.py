from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from database import Base

class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    phone = Column(String, index=True, nullable=False)
    contact_name = Column(String, nullable=True)
    last_message_content = Column(String, nullable=True)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="open", index=True)  # open, resolved
    unread_count = Column(Integer, default=0)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    labels = Column(JSON, default=list)  # Lista de strings: ["importante", "suporte", etc]
    last_contact_message_at = Column(DateTime(timezone=True), nullable=True)
    pinned = Column(Boolean, default=False, nullable=False)
    private_note = Column(String, nullable=True)
    human_handover_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @validates('labels')
    def validate_labels(self, key, value):
        if not value:
            return []
        if not isinstance(value, list):
            return value
        unique_labels = []
        seen = set()
        for l in value:
            if isinstance(l, str):
                l_clean = l.strip()
                l_lower = l_clean.lower()
                if l_lower not in seen:
                    seen.add(l_lower)
                    unique_labels.append(l_clean)
            else:
                unique_labels.append(l)
        return unique_labels

    # Relationships
    client = relationship("Client", backref="chat_conversations")
    assigned_user = relationship("User", backref="assigned_conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index('idx_chat_messages_convo_time', 'conversation_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    sender_type = Column(String, nullable=False)  # contact, user, system
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    message_type = Column(String, default="text")  # text, image, audio, video, document
    content = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    wa_message_id = Column(String, nullable=True, index=True)
    meta_data = Column(JSON, nullable=True)
    
    # Logs do Webhook de mensagens do AgentFlow
    agentflow_webhook_status = Column(String, nullable=True)
    agentflow_webhook_error = Column(String, nullable=True)

    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")
    user = relationship("User", backref="sent_chat_messages")

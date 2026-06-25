from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class UploadedMedia(Base):
    __tablename__ = "uploaded_medias"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False) # original filename
    unique_name = Column(String(255), nullable=False) # generated unique uuid name
    url = Column(String(1024), nullable=False)
    media_type = Column(String(50), nullable=False) # IMAGE, VIDEO, DOCUMENT
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    client = relationship("Client")

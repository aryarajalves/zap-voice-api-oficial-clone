from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from .base import user_clients

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user") # super_admin, admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    accessible_clients = relationship("Client", secondary=user_clients, backref="users_with_access")
    client = relationship("Client", backref="users_in_this_client")
    seller_weight = Column(Integer, default=1, nullable=False)
    blocked_features = Column(String, default="[]", nullable=False)
    blocked_nodes = Column(String, default="[]", nullable=False)



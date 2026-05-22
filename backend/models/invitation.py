from sqlalchemy import Table, Column, Integer, ForeignKey, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# Tabela associativa entre convites e clientes
invitation_clients = Table(
    "invitation_clients",
    Base.metadata,
    Column("invitation_id", Integer, ForeignKey("user_invitations.id", ondelete="CASCADE"), primary_key=True),
    Column("client_id", Integer, ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True)
)

class UserInvitation(Base):
    __tablename__ = "user_invitations"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False, default="user") # admin, premium, user
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relações
    accessible_clients = relationship("Client", secondary=invitation_clients, backref="associated_invitations")
    created_by = relationship("User", foreign_keys=[created_by_id])

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Project(Base):
    """
    Agrupa múltiplos clientes (números de WhatsApp) sob o mesmo escopo.
    Permite compartilhamento do banco de contatos/leads entre os clientes do mesmo projeto.
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamento de volta para Clientes
    clients = relationship("Client", back_populates="project")

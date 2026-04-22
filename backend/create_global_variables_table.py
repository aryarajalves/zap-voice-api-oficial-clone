from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base, engine
from sqlalchemy.orm import relationship

class GlobalVariable(Base):
    """
    Variáveis globais que podem ser usadas em funis (ex: {{var:nome}})
    """
    __tablename__ = "global_variables"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, index=True, nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Create table directly
Base.metadata.create_all(bind=engine)
print("GlobalVariable table created successfully.")

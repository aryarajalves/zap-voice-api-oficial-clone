from sqlalchemy import Table, Column, Integer, ForeignKey
from database import Base

# Association table for User-Client Many-to-Many relationship
user_clients = Table(
    "user_clients",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("client_id", Integer, ForeignKey("clients.id"), primary_key=True)
)

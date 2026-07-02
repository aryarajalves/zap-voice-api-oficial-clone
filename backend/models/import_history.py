from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ContactImportHistory(Base):
    __tablename__ = "contact_import_history"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    filename = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    total_rows = Column(Integer, default=0)
    imported_rows = Column(Integer, default=0)
    error_rows = Column(Integer, default=0)
    error_message = Column(String, nullable=True)

    # Linhas do arquivo original ANTES de qualquer filtro (telefone inválido / duplicado
    # dentro do próprio arquivo) — `total_rows` acima já é pós-filtro (é o que efetivamente
    # é processado), então esse campo existe para o usuário poder ver a diferença entre
    # "quantas linhas o arquivo tinha" e "quantas realmente foram tentadas".
    original_total_rows = Column(Integer, default=0)
    rejected_invalid_phone_rows = Column(Integer, default=0)
    rejected_duplicate_rows = Column(Integer, default=0)

    # Campos para suporte a resumo após reinicialização
    file_path = Column(String, nullable=True)       # caminho do arquivo salvo em disco
    file_ext = Column(String, nullable=True)        # extensão do arquivo (csv, xlsx...)
    mapping_json = Column(Text, nullable=True)      # mapeamento de colunas em JSON
    fixed_tags = Column(String, nullable=True)      # tags fixas a adicionar
    fixed_remove_tags = Column(String, nullable=True)  # tags fixas a remover

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    client = relationship("Client")
    project = relationship("Project")

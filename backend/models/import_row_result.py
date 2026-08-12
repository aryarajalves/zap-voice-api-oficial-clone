from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base


class ImportRowResult(Base):
    """
    Resultado individual de cada linha processada numa importação de contatos
    (contact_import_history). Guardar isso por linha permite que o usuário veja
    exatamente QUAIS contatos foram importados/atualizados e QUAIS foram
    rejeitados (e o motivo), em vez de só um contador agregado — antes disso,
    linhas descartadas por telefone inválido ou duplicado dentro do próprio
    arquivo desapareciam silenciosamente, sem nenhum rastro.
    """
    __tablename__ = "import_row_results"
    __table_args__ = (
        Index("idx_import_row_results_import_status", "import_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("contact_import_history.id", ondelete="CASCADE"), nullable=False, index=True)

    row_index = Column(Integer, nullable=True)  # posição da linha no arquivo original (0-based), quando aplicável
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True, index=True)

    # status: 'imported' (contato novo criado), 'updated' (contato existente atualizado),
    # 'rejected_invalid_phone' (telefone com menos de 8 dígitos após limpeza),
    # 'rejected_duplicate_file' (telefone duplicado dentro do próprio arquivo importado),
    # 'error' (exceção ao processar a linha)
    status = Column(String, nullable=False, index=True)
    reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # passive_deletes=True: quando um ContactImportHistory é deletado via ORM
    # (db.delete(history)), o SQLAlchemy não tenta carregar e anular o import_id (NOT NULL)
    # dessas linhas filhas — ele deixa o próprio Postgres cascatear via ondelete="CASCADE"
    # acima. Sem isso, deletar uma importação com milhares de linhas geraria um
    # IntegrityError (tentativa de UPDATE ... SET import_id = NULL numa coluna NOT NULL).
    import_history = relationship("ContactImportHistory", backref=backref("row_results", passive_deletes=True))


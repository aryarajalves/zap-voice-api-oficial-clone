import pytest
from datetime import datetime, timezone
from sqlalchemy import text
from database import SessionLocal
from services.window_manager import sync_contact_to_custom_table

def test_sync_contact_to_custom_table_isolated():
    """Valida se sync_contact_to_custom_table executa os scripts SQL corretos no banco."""
    db = SessionLocal()
    try:
        # Garante que a tabela não existe
        db.execute(text("DROP TABLE IF EXISTS contatos_monitorados"))
        db.commit()
        
        # Executa a sincronização do contato
        sync_contact_to_custom_table(
            db=db,
            client_id=1,
            phone="5511999991111",
            name="Arya Stark",
            inbox_id=42,
            last_interaction_at=datetime.now(timezone.utc)
        )
        
        # Consulta o banco para validar se os dados foram inseridos
        result = db.execute(text("SELECT * FROM contatos_monitorados WHERE phone = '5511999991111'")).first()
        assert result is not None
        assert result.phone == "5511999991111"
        assert result.name == "Arya Stark"
        assert result.inbox_id == 42
    finally:
        # Limpa o banco após o teste
        db.execute(text("DROP TABLE IF EXISTS contatos_monitorados"))
        db.commit()
        db.close()

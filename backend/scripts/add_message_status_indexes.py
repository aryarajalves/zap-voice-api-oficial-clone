import os
import sys
from sqlalchemy import create_engine, text

# Adiciona o diretório do backend ao sys.path para importar database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import DATABASE_URL

def apply_indexes():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Criando índices na tabela message_status...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_message_status_phone_number ON message_status (phone_number);",
            "CREATE INDEX IF NOT EXISTS ix_message_status_status ON message_status (status);",
            "CREATE INDEX IF NOT EXISTS ix_message_status_trigger_status ON message_status (trigger_id, status);",
            "CREATE INDEX IF NOT EXISTS ix_message_status_trigger_phone ON message_status (trigger_id, phone_number);"
        ]
        for sql in indexes:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"Executado: {sql}")
            except Exception as e:
                print(f"Erro ao executar '{sql}': {e}")
    print("Índices verificados/criados com sucesso!")

if __name__ == "__main__":
    apply_indexes()

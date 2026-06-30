import os
import sys
from sqlalchemy import create_engine, text

# Adicionar caminho do backend para imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine

def migrate():
    print("Iniciando migração para adicionar coluna last_contact_message_at...")
    
    # SQL correspondente
    alter_sql = text("ALTER TABLE chat_conversations ADD COLUMN last_contact_message_at TIMESTAMP WITH TIME ZONE;")
    
    with engine.begin() as conn:
        try:
            conn.execute(alter_sql)
            print("✅ Coluna last_contact_message_at adicionada com sucesso no banco de dados!")
        except Exception as e:
            # Caso a coluna já exista, evita quebrar a migração
            if "already exists" in str(e) or "duplicate column name" in str(e).lower():
                print("ℹ️ A coluna last_contact_message_at já existe no banco de dados.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")
                sys.exit(1)

if __name__ == "__main__":
    migrate()

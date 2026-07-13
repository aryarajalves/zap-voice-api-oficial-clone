import sys
import os
from sqlalchemy import create_engine, text

# Adicionar pasta backend ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SQLALCHEMY_DATABASE_URL

def migrate():
    print(f"Iniciando migração no banco de dados...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        # Verificar se a coluna já existe
        is_postgres = "postgresql" in SQLALCHEMY_DATABASE_URL
        
        try:
            if is_postgres:
                conn.execute(text("ALTER TABLE chat_conversations ADD COLUMN human_handover_at TIMESTAMP WITH TIME ZONE NULL;"))
            else:
                conn.execute(text("ALTER TABLE chat_conversations ADD COLUMN human_handover_at TIMESTAMP NULL;"))
            conn.commit()
            print("✅ Coluna 'human_handover_at' adicionada com sucesso na tabela chat_conversations!")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ A coluna 'human_handover_at' já existe. Nenhuma alteração feita.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")
                sys.exit(1)

if __name__ == "__main__":
    migrate()

import os
import sys
from sqlalchemy import text

# Adiciona o diretório backend ao path para conseguir importar database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def migrate():
    print("🚀 Iniciando migração para adicionar duplicate_count em webhook_history...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Verifica se a coluna já existe
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='webhook_history' AND column_name='duplicate_count';"
            )).fetchone()
            
            if not res:
                print("➕ Adicionando coluna duplicate_count na tabela webhook_history...")
                conn.execute(text("ALTER TABLE webhook_history ADD COLUMN duplicate_count INTEGER DEFAULT 0 NOT NULL;"))
                print("✅ Coluna duplicate_count adicionada com sucesso!")
            else:
                print("ℹ️ A coluna duplicate_count já existe em webhook_history.")
                
            trans.commit()
        except Exception as e:
            trans.rollback()
            print(f"❌ Erro ao rodar migração: {e}")
            raise e

if __name__ == "__main__":
    migrate()

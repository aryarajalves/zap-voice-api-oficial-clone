import sys
import os
from sqlalchemy import text

# Adiciona o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine

def run_migration():
    print("⏳ Verificando/adicionando coluna meta_data na tabela chat_messages...")
    
    # Verifica se a coluna meta_data já existe na tabela chat_messages
    query_check = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'chat_messages' AND column_name = 'meta_data';
    """)
    
    try:
        # Se for PostgreSQL, podemos usar a query acima
        is_postgres = "postgresql" in str(engine.url)
        column_exists = False
        
        with engine.connect() as conn:
            if is_postgres:
                res = conn.execute(query_check).fetchone()
                if res:
                    column_exists = True
            else:
                # Para SQLite/outros, testamos selecionando a coluna diretamente
                try:
                    conn.execute(text("SELECT meta_data FROM chat_messages LIMIT 1"))
                    column_exists = True
                except Exception:
                    column_exists = False
            
            if not column_exists:
                print("🆕 Coluna meta_data não encontrada. Adicionando...")
                # Cria a coluna com tipo adequado
                sql_type = "JSONB" if is_postgres else "JSON"
                conn.execute(text(f"ALTER TABLE chat_messages ADD COLUMN meta_data {sql_type} NULL"))
                conn.commit()
                print("✅ Coluna meta_data adicionada com sucesso!")
            else:
                print("✅ Coluna meta_data já existe na tabela chat_messages.")
                
    except Exception as e:
        print(f"❌ Erro ao rodar migração da coluna meta_data: {e}")

if __name__ == "__main__":
    run_migration()

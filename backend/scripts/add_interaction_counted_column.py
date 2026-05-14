import os
import sys
from sqlalchemy import text

# Adiciona a raiz do app ao path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from database import engine

def add_interaction_counted_column():
    print("🚀 Iniciando migração para adicionar 'interaction_counted' na tabela 'message_status'...")
    
    with engine.connect() as conn:
        try:
            # Verifica se a coluna já existe (Postgres)
            if engine.url.drivername.startswith("postgresql"):
                check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='message_status' AND column_name='interaction_counted';
                """)
                result = conn.execute(check_query).fetchone()
                
                if not result:
                    print("➕ Adicionando coluna 'interaction_counted' no PostgreSQL...")
                    conn.execute(text("ALTER TABLE message_status ADD COLUMN interaction_counted BOOLEAN DEFAULT FALSE;"))
                    conn.commit()
                    print("✅ Coluna adicionada com sucesso!")
                else:
                    print("ℹ️ Coluna 'interaction_counted' já existe.")
            
            # SQLite (para desenvolvimento local)
            else:
                try:
                    conn.execute(text("ALTER TABLE message_status ADD COLUMN interaction_counted BOOLEAN DEFAULT FALSE;"))
                    conn.commit()
                    print("✅ Coluna adicionada com sucesso (SQLite)!")
                except Exception as e:
                    if "duplicate column name" in str(e).lower():
                        print("ℹ️ Coluna 'interaction_counted' já existe.")
                    else:
                        raise e

        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            sys.exit(1)

if __name__ == "__main__":
    add_interaction_counted_column()

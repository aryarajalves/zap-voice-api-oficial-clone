import os
import sys
from sqlalchemy import text

# Adiciona a raiz do app ao path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from database import engine

def migrate():
    print("🚀 Iniciando migração para adicionar colunas de funis interativos à tabela 'scheduled_triggers'...")
    
    columns_to_add = [
        ("interaction_funnel_id", "INTEGER"),
        ("block_funnel_id", "INTEGER")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            try:
                # Verifica se a coluna já existe (Postgres)
                if engine.url.drivername.startswith("postgresql"):
                    check_query = text(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name='scheduled_triggers' AND column_name='{col_name}';
                    """)
                    result = conn.execute(check_query).fetchone()
                    
                    if not result:
                        print(f"➕ Adicionando coluna '{col_name}' no PostgreSQL...")
                        conn.execute(text(f"ALTER TABLE scheduled_triggers ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                        print(f"✅ Coluna '{col_name}' adicionada com sucesso!")
                    else:
                        print(f"ℹ️ Coluna '{col_name}' já existe.")
                
                # SQLite
                else:
                    try:
                        conn.execute(text(f"ALTER TABLE scheduled_triggers ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                        print(f"✅ Coluna '{col_name}' adicionada com sucesso (SQLite)!")
                    except Exception as e:
                        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                            print(f"ℹ️ Coluna '{col_name}' já existe.")
                        else:
                            raise e
            except Exception as e:
                print(f"❌ Erro ao adicionar coluna '{col_name}': {e}")

if __name__ == "__main__":
    migrate()
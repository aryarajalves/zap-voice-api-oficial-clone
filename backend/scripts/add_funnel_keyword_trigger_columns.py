import os
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis do .env do backend
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")

# Se estiver fora do container, tenta usar localhost
if db_url and "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

print("Iniciando migração: Adicionando colunas de palavra-chave e limite a tabela 'funnels'...")

if db_url and db_url.startswith("postgresql"):
    try:
        print(f"Conectando ao PostgreSQL: {db_url.split('@')[-1]}")
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        columns_to_add = [
            ("trigger_match_type", "VARCHAR DEFAULT 'contains'"),
            ("trigger_limit_type", "VARCHAR DEFAULT 'none'"),
            ("is_trigger_active", "BOOLEAN DEFAULT TRUE")
        ]

        for col_name, col_type in columns_to_add:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'funnels' AND column_name = %s
            """, (col_name,))
            
            if cursor.fetchone():
                print(f"A coluna '{col_name}' já existe na tabela 'funnels'. Pulando...")
            else:
                print(f"Adicionando coluna '{col_name}' ({col_type})...")
                cursor.execute(f"ALTER TABLE funnels ADD COLUMN {col_name} {col_type}")
                print(f"Coluna '{col_name}' adicionada com sucesso!")

        conn.close()
        print("Migração PostgreSQL concluída com sucesso.")
    except Exception as e:
        print(f"Erro durante a migração PostgreSQL: {e}")
        exit(1)
else:
    import sqlite3
    sqlite_path = os.path.join(os.path.dirname(__file__), '..', 'zapvoice.db')
    print(f"Conectando ao SQLite: {sqlite_path}")
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(funnels)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    
    columns_to_add = [
        ("trigger_match_type", "TEXT DEFAULT 'contains'"),
        ("trigger_limit_type", "TEXT DEFAULT 'none'"),
        ("is_trigger_active", "BOOLEAN DEFAULT 1")
    ]
    for col_name, col_type in columns_to_add:
        if col_name in existing_cols:
            print(f"A coluna '{col_name}' já existe no SQLite.")
        else:
            cursor.execute(f"ALTER TABLE funnels ADD COLUMN {col_name} {col_type}")
            print(f"Coluna '{col_name}' adicionada no SQLite!")
    conn.commit()
    conn.close()
    print("Migração SQLite concluída.")

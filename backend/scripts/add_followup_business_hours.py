import os
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis do .env do backend
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")

# Tentar conectar primeiro com a URL direta. Se falhar, tenta com a porta exposta local.
try:
    print(f"Tentando conectar com a URL padrao do env...")
    conn = psycopg2.connect(db_url)
except Exception as e:
    if db_url and "zapvoice-postgres" in db_url:
        print("Conexao direta falhou. Tentando com localhost:5435 (fora do container)...")
        db_url = db_url.replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")
        conn = psycopg2.connect(db_url)
    else:
        raise e

conn.autocommit = True
cursor = conn.cursor()

try:
    # Colunas novas para a tabela webhook_event_mappings
    columns_mapping = [
        ("followup_business_hours_active", "BOOLEAN DEFAULT FALSE"),
        ("followup_business_hours_start", "VARCHAR DEFAULT '08:00'"),
        ("followup_business_hours_end", "VARCHAR DEFAULT '18:00'"),
        ("followup_business_hours_days", "JSON DEFAULT '[0,1,2,3,4]'::json")
    ]

    for col_name, col_type in columns_mapping:
        cursor.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'webhook_event_mappings' AND column_name = '{col_name}'
        """)
        if cursor.fetchone():
            print(f"A coluna '{col_name}' ja existe na tabela 'webhook_event_mappings'. Pulando...")
        else:
            print(f"Adicionando coluna '{col_name}' na tabela 'webhook_event_mappings'...")
            cursor.execute(f"ALTER TABLE webhook_event_mappings ADD COLUMN {col_name} {col_type}")
            print(f"Coluna '{col_name}' adicionada com sucesso!")

    conn.close()
    print("Migracao de horario comercial de follow-up concluida com sucesso.")

except Exception as e:
    print(f"Erro durante a migracao: {e}")
    exit(1)

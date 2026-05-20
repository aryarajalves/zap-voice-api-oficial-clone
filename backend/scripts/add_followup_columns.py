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
    # 1. Colunas para a tabela webhook_event_mappings
    columns_mapping = [
        ("followup_active", "BOOLEAN DEFAULT FALSE"),
        ("followup_template_name", "VARCHAR NULL"),
        ("followup_template_id", "BIGINT NULL"),
        ("followup_delay_value", "INTEGER DEFAULT 0"),
        ("followup_delay_unit", "VARCHAR DEFAULT 'minutes'"),
        ("followup_variables_mapping", "JSON NULL")
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

    # 2. Coluna para a tabela scheduled_triggers
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheduled_triggers' AND column_name = 'is_followup'
    """)
    if cursor.fetchone():
        print("A coluna 'is_followup' ja existe na tabela 'scheduled_triggers'. Pulando...")
    else:
        print("Adicionando coluna 'is_followup' na tabela 'scheduled_triggers'...")
        cursor.execute("ALTER TABLE scheduled_triggers ADD COLUMN is_followup BOOLEAN DEFAULT FALSE")
        print("Coluna 'is_followup' adicionada com sucesso!")

    conn.close()
    print("Migracao concluida com sucesso.")

except Exception as e:
    print(f"Erro durante a migracao: {e}")
    exit(1)

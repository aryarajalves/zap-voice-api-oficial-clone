import os
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis do .env do backend
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")

# Se estiver fora do container, tenta usar localhost
if "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

print("Iniciando migracao: Adicionando coluna 'is_active' a tabela 'funnels'...")
print(f"Conectando ao banco: {db_url.split('@')[-1]}")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()

    # Verificar se a coluna já existe
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'funnels' AND column_name = 'is_active'
    """)
    
    if cursor.fetchone():
        print("A coluna 'is_active' ja existe na tabela 'funnels'. Pulando...")
    else:
        print("Adicionando coluna 'is_active'...")
        cursor.execute('ALTER TABLE funnels ADD COLUMN is_active BOOLEAN DEFAULT TRUE')
        print("Coluna 'is_active' adicionada com sucesso!")

    conn.close()
    print("Migracao concluida com sucesso.")

except Exception as e:
    print(f"Erro durante a migracao: {e}")
    exit(1)

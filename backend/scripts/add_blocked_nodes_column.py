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

print("Iniciando migracao: Adicionando coluna 'blocked_nodes' as tabelas 'users' e 'user_invitations'...")
print(f"Conectando ao banco: {db_url.split('@')[-1] if db_url else 'DATABASE_URL nao configurada'}")

if not db_url:
    print("DATABASE_URL nao encontrada no ambiente!")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()

    # 1. Tabela 'users'
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'blocked_nodes'
    """)
    if cursor.fetchone():
        print("A coluna 'blocked_nodes' ja existe na tabela 'users'. Pulando...")
    else:
        print("Adicionando coluna 'blocked_nodes' na tabela 'users'...")
        cursor.execute("ALTER TABLE users ADD COLUMN blocked_nodes VARCHAR DEFAULT '[]'")
        print("Coluna 'blocked_nodes' adicionada com sucesso na tabela 'users'!")

    # 2. Tabela 'user_invitations'
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_invitations' AND column_name = 'blocked_nodes'
    """)
    if cursor.fetchone():
        print("A coluna 'blocked_nodes' ja existe na tabela 'user_invitations'. Pulando...")
    else:
        print("Adicionando coluna 'blocked_nodes' na tabela 'user_invitations'...")
        cursor.execute("ALTER TABLE user_invitations ADD COLUMN blocked_nodes VARCHAR DEFAULT '[]'")
        print("Coluna 'blocked_nodes' adicionada com sucesso na tabela 'user_invitations'!")

    conn.close()
    print("Migracao de blocked_nodes concluida com sucesso.")

except Exception as e:
    print(f"Erro durante a migracao: {e}")
    exit(1)

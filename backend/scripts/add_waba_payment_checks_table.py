import os
import sys
import psycopg2
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Carregar variáveis do .env do backend
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")

# Se estiver rodando fora do container, substitui o host se necessário
if db_url and "zapvoice-postgres" in db_url:
    db_url = db_url.replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

print("🏗️  Iniciando migração: Criando tabela 'waba_payment_checks'...")

if db_url and db_url.startswith("postgresql"):
    try:
        print(f"Conectando ao PostgreSQL: {db_url.split('@')[-1]}")
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS waba_payment_checks (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                status VARCHAR(50) DEFAULT 'HEALTHY' NOT NULL,
                check_type VARCHAR(20) DEFAULT 'AUTOMATIC' NOT NULL,
                account_review_status VARCHAR(50),
                currency VARCHAR(10),
                payment_method_status VARCHAR(100),
                credit_line_status VARCHAR(100),
                has_error BOOLEAN DEFAULT FALSE NOT NULL,
                details TEXT,
                raw_data TEXT
            );
        """)
        print("✅ Tabela waba_payment_checks criada ou verificada no PostgreSQL.")

        cursor.execute("CREATE INDEX IF NOT EXISTS ix_waba_payment_checks_client_id ON waba_payment_checks (client_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_waba_payment_checks_checked_at ON waba_payment_checks (checked_at);")
        print("✅ Índices criados no PostgreSQL.")

        conn.close()
        print("✨ Migração PostgreSQL concluída com sucesso.")
    except Exception as e:
        print(f"❌ Erro durante a migração PostgreSQL: {e}")
else:
    import sqlite3
    sqlite_path = os.path.join(os.path.dirname(__file__), '..', 'zapvoice.db')
    print(f"Conectando ao SQLite: {sqlite_path}")
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS waba_payment_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            status TEXT DEFAULT 'HEALTHY' NOT NULL,
            check_type TEXT DEFAULT 'AUTOMATIC' NOT NULL,
            account_review_status TEXT,
            currency TEXT,
            payment_method_status TEXT,
            credit_line_status TEXT,
            has_error BOOLEAN DEFAULT 0 NOT NULL,
            details TEXT,
            raw_data TEXT
        );
    """)
    conn.commit()
    conn.close()
    print("✨ Migração SQLite concluída.")

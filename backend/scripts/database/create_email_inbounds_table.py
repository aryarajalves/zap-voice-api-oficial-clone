import os
import sys
from sqlalchemy import create_engine, text

# Adicionar pasta raiz do backend ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

if not os.getenv("DATABASE_URL"):
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")))
    except Exception:
        pass
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///sqlite.db"

from database import engine

def migrate():
    print("🔄 [MIGRATION] Criando tabela email_inbounds no banco de dados...")
    sql = """
    CREATE TABLE IF NOT EXISTS email_inbounds (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        dispatch_id INTEGER NULL,
        lead_id INTEGER NULL,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255) NULL,
        to_email VARCHAR(255) NULL,
        subject VARCHAR(500) NULL,
        body_text TEXT NULL,
        body_html TEXT NULL,
        provider VARCHAR(50) DEFAULT 'generic',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    # Suporte a SQLite ou PostgreSQL
    with engine.connect() as conn:
        if "sqlite" in str(engine.url):
            sqlite_sql = """
            CREATE TABLE IF NOT EXISTS email_inbounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                dispatch_id INTEGER NULL,
                lead_id INTEGER NULL,
                from_email VARCHAR(255) NOT NULL,
                from_name VARCHAR(255) NULL,
                to_email VARCHAR(255) NULL,
                subject VARCHAR(500) NULL,
                body_text TEXT NULL,
                body_html TEXT NULL,
                provider VARCHAR(50) DEFAULT 'generic',
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
            conn.execute(text(sqlite_sql))
        else:
            conn.execute(text(sql))
        conn.commit()
    print("✅ [MIGRATION] Tabela email_inbounds criada/verificada com sucesso!")

if __name__ == "__main__":
    migrate()

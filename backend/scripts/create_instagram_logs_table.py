import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Adicionar pasta pai ao path para poder importar módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value.strip('"').strip("'")

load_env()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
try:
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL não configurado")
    engine = create_engine(DATABASE_URL)
    engine.connect().close()
except Exception:
    if DATABASE_URL and "zapvoice-postgres" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres:5432", "localhost:5435")
        DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres", "localhost:5435")
        engine = create_engine(DATABASE_URL)

if not engine:
    print("❌ Não foi possível configurar a conexão com o banco de dados.")
    exit(1)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_instagram_logs_table():
    db = SessionLocal()
    is_sqlite = DATABASE_URL.startswith("sqlite")
    
    if is_sqlite:
        create_query = """
        CREATE TABLE IF NOT EXISTS instagram_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            instagram_username VARCHAR,
            instagram_user_id VARCHAR,
            post_id VARCHAR,
            comment_id VARCHAR,
            comment_text VARCHAR,
            status VARCHAR NOT NULL DEFAULT 'no_match',
            actions_taken VARCHAR,
            error_message VARCHAR,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id)
        );
        """
        create_idx_client = "CREATE INDEX IF NOT EXISTS idx_insta_log_client ON instagram_logs (client_id);"
    else:
        # PostgreSQL
        create_query = """
        CREATE TABLE IF NOT EXISTS instagram_logs (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            instagram_username VARCHAR,
            instagram_user_id VARCHAR,
            post_id VARCHAR,
            comment_id VARCHAR,
            comment_text VARCHAR,
            status VARCHAR NOT NULL DEFAULT 'no_match',
            actions_taken VARCHAR,
            error_message VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """
        create_idx_client = "CREATE INDEX IF NOT EXISTS idx_insta_log_client ON instagram_logs (client_id);"

    try:
        db.execute(text(create_query))
        db.execute(text(create_idx_client))
        db.commit()
        print("Tabela instagram_logs criada ou verificada com sucesso.")
    except Exception as e:
        print(f"Erro ao criar tabela instagram_logs: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_instagram_logs_table()

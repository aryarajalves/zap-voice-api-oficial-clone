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

# Tenta conectar usando a DATABASE_URL do .env (que funciona dentro do Docker).
# Se falhar e estivermos rodando localmente fora do docker (localhost), ajustamos o host.
engine = None
try:
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL não configurado")
    # Tenta criar conexão inicial
    engine = create_engine(DATABASE_URL)
    engine.connect().close()
except Exception:
    if DATABASE_URL and "zapvoice-postgres" in DATABASE_URL:
        # Se falhar fora do container, tenta usar localhost e a porta mapeada 5435
        DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres:5432", "localhost:5435")
        DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres", "localhost:5435")
        engine = create_engine(DATABASE_URL)

if not engine:
    print("❌ Não foi possível configurar a conexão com o banco de dados.")
    exit(1)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_instagram_automations_table():
    db = SessionLocal()
    # Verifica o tipo de banco
    is_sqlite = DATABASE_URL.startswith("sqlite")
    
    # Query SQL para criar a tabela se não existir
    if is_sqlite:
        create_query = """
        CREATE TABLE IF NOT EXISTS instagram_automations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            name VARCHAR NOT NULL,
            post_id VARCHAR NOT NULL DEFAULT 'all',
            trigger_type VARCHAR NOT NULL DEFAULT 'keyword',
            keywords VARCHAR,
            action_type VARCHAR NOT NULL DEFAULT 'both',
            reply_comments JSON NOT NULL,
            funnel_id INTEGER,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(funnel_id) REFERENCES funnels(id)
        );
        """
        create_idx_client = "CREATE INDEX IF NOT EXISTS idx_insta_client ON instagram_automations (client_id);"
    else:
        # PostgreSQL
        create_query = """
        CREATE TABLE IF NOT EXISTS instagram_automations (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            post_id VARCHAR NOT NULL DEFAULT 'all',
            trigger_type VARCHAR NOT NULL DEFAULT 'keyword',
            keywords VARCHAR,
            action_type VARCHAR NOT NULL DEFAULT 'both',
            reply_comments JSONB NOT NULL DEFAULT '[]'::jsonb,
            funnel_id INTEGER REFERENCES funnels(id) ON DELETE SET NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """
        create_idx_client = "CREATE INDEX IF NOT EXISTS idx_insta_client ON instagram_automations (client_id);"

    try:
        db.execute(text(create_query))
        db.execute(text(create_idx_client))
        db.commit()
        print("✅ Tabela instagram_automations criada ou verificada com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_instagram_automations_table()

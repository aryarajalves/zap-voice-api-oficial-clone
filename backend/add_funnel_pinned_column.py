import os
import socket
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load .env manually
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value.strip('"').strip("'")

load_env()

DATABASE_URL = os.getenv("DATABASE_URL")

# Auto-detect if we can resolve the docker database host 'zapvoice-postgres'
def can_resolve(host):
    try:
        socket.gethostbyname(host)
        return True
    except socket.gaierror:
        return False

if DATABASE_URL:
    if "zapvoice-postgres" in DATABASE_URL:
        if not can_resolve("zapvoice-postgres"):
            # Running outside docker, map host and port
            DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres:5432", "localhost:5435")
            DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres", "localhost")
            print("🔌 Rodando fora do Docker. Ajustando DATABASE_URL para localhost:5435.")
        else:
            print("🐳 Rodando dentro do Docker. Usando DATABASE_URL padrão do container.")

if not DATABASE_URL:
    print("❌ DATABASE_URL não encontrada no .env")
    exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_pinned_column():
    db = SessionLocal()
    try:
        # Tenta adicionar is_pinned
        try:
            db.execute(text("ALTER TABLE funnels ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE"))
            db.commit()
            print("✅ Coluna is_pinned adicionada com sucesso.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e) or "duplicate column" in str(e):
                print("ℹ️ Coluna is_pinned já existe no banco de dados.")
            else:
                print(f"❌ Erro ao adicionar coluna is_pinned: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_pinned_column()

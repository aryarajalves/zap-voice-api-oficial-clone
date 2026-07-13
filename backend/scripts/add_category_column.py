import os
import sys
import socket
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ajusta path para rodar a partir do script
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

def can_resolve(host):
    try:
        socket.gethostbyname(host)
        return True
    except socket.gaierror:
        return False

if DATABASE_URL:
    if "zapvoice-postgres" in DATABASE_URL:
        if not can_resolve("zapvoice-postgres"):
            DATABASE_URL = DATABASE_URL.replace("@zapvoice-postgres:5432/", "@localhost:5435/")
            DATABASE_URL = DATABASE_URL.replace("@zapvoice-postgres/", "@localhost/")
    elif "@postgres:5432/" in DATABASE_URL:
        if not can_resolve("postgres"):
            DATABASE_URL = DATABASE_URL.replace("@postgres:5432/", "@localhost:5435/")
            DATABASE_URL = DATABASE_URL.replace("@postgres/", "@localhost/")

if not DATABASE_URL:
    print("❌ DATABASE_URL não encontrada no .env")
    exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_category():
    db = SessionLocal()
    try:
        print("🔄 Iniciando migração para adicionar coluna category em whatsapp_template_cache...")
        try:
            db.execute(text("ALTER TABLE whatsapp_template_cache ADD COLUMN category VARCHAR DEFAULT 'MARKETING'"))
            db.commit()
            print("✅ Coluna category adicionada com sucesso!")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e) or "duplicate column" in str(e):
                print("ℹ️ Coluna category já existe na tabela whatsapp_template_cache.")
            else:
                print(f"❌ Erro ao adicionar coluna category: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_category()

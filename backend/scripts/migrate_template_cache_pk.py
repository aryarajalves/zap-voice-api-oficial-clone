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

def migrate_pk():
    db = SessionLocal()
    try:
        # Tenta remover a PK antiga e adicionar a PK composta
        print("🔄 Iniciando migração de chave primária composta para whatsapp_template_cache...")
        try:
            # 1. Remover a constraint da PK antiga (se existir)
            db.execute(text("ALTER TABLE whatsapp_template_cache DROP CONSTRAINT IF EXISTS whatsapp_template_cache_pkey CASCADE"))
            db.commit()
            print("✅ Constraint de PK antiga removida (se existia).")
        except Exception as e_drop:
            db.rollback()
            print(f"⚠️ Aviso ao remover PK antiga: {e_drop}")

        try:
            # 2. Criar a nova PK composta por (id, client_id)
            db.execute(text("ALTER TABLE whatsapp_template_cache ADD PRIMARY KEY (id, client_id)"))
            db.commit()
            print("✅ Nova Primary Key composta (id, client_id) criada com sucesso!")
        except Exception as e_add:
            db.rollback()
            if "already exists" in str(e_add) or "multiple primary keys" in str(e_add):
                print("ℹ️ A tabela já possui a chave primária composta (id, client_id) ou outra PK ativa.")
            else:
                print(f"❌ Erro ao adicionar PK composta: {e_add}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_pk()

import os
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
if DATABASE_URL and "zapvoice-postgres" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres", "localhost")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_trigger_id_to_status_info():
    db = SessionLocal()
    try:
        # Adicionar coluna trigger_id à tabela dinâmica status_info
        db.execute(text("ALTER TABLE status_info ADD COLUMN IF NOT EXISTS trigger_id INTEGER"))
        db.commit()
        print("✅ Coluna trigger_id adicionada à tabela status_info.")
    except Exception as e:
        print(f"❌ Erro ao adicionar coluna: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_trigger_id_to_status_info()

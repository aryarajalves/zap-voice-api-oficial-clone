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

def add_approved_delay_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS approved_delay_amount INTEGER DEFAULT 0"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS approved_delay_unit VARCHAR DEFAULT 'seconds'"))
        db.commit()
        print("✅ Colunas approved_delay_amount e approved_delay_unit adicionadas com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao adicionar colunas: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_approved_delay_columns()

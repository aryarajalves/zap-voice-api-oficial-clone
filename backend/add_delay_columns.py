from database import SessionLocal
from sqlalchemy import text

def add_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delay_amount INTEGER DEFAULT 0"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delay_unit VARCHAR DEFAULT 'seconds'"))
        db.commit()
        print("✅ Colunas delay_amount e delay_unit adicionadas com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao adicionar colunas: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()

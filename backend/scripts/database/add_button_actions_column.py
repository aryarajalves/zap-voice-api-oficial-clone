"""
Migration: add button_actions column to scheduled_triggers
Run once: python backend/scripts/database/add_button_actions_column.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from database import SessionLocal
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        dialect = db.bind.dialect.name
        if dialect == 'postgresql':
            db.execute(text("""
                ALTER TABLE scheduled_triggers
                ADD COLUMN IF NOT EXISTS button_actions JSONB DEFAULT NULL;
            """))
        else:
            # SQLite
            db.execute(text("""
                ALTER TABLE scheduled_triggers
                ADD COLUMN button_actions TEXT DEFAULT NULL;
            """))
        db.commit()
        print("✅ Coluna button_actions adicionada com sucesso.")
    except Exception as e:
        print(f"⚠️  {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()

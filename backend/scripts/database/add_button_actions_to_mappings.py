"""
Migration: add button_actions column to webhook_event_mappings
Run once: python backend/scripts/database/add_button_actions_to_mappings.py
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
                ALTER TABLE webhook_event_mappings
                ADD COLUMN IF NOT EXISTS button_actions JSONB DEFAULT NULL;
            """))
        else:
            # SQLite
            db.execute(text("""
                ALTER TABLE webhook_event_mappings
                ADD COLUMN button_actions TEXT DEFAULT NULL;
            """))
        db.commit()
        print("✅ Coluna button_actions adicionada com sucesso na tabela webhook_event_mappings.")
    except Exception as e:
        print(f"⚠️  {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()

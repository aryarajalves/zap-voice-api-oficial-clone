"""
Migration: add feedback_filter column to webhook_event_mappings
Run once: python backend/scripts/database/add_feedback_filter_column.py
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
                ADD COLUMN IF NOT EXISTS feedback_filter VARCHAR DEFAULT NULL;
            """))
        else:
            # SQLite
            db.execute(text("""
                ALTER TABLE webhook_event_mappings
                ADD COLUMN feedback_filter VARCHAR DEFAULT NULL;
            """))
        db.commit()
        print("✅ Coluna feedback_filter adicionada com sucesso na tabela webhook_event_mappings.")
    except Exception as e:
        print(f"⚠️  {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()

"""
Migration: add button_actions column to recurring_triggers
Run once: python backend/scripts/database/add_button_actions_to_recurring.py
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
                ALTER TABLE recurring_triggers
                ADD COLUMN IF NOT EXISTS button_actions JSONB DEFAULT NULL;
            """))
        else:
            # SQLite
            db.execute(text("""
                ALTER TABLE recurring_triggers
                ADD COLUMN button_actions TEXT DEFAULT NULL;
            """))
        db.commit()
        print("[OK] Coluna button_actions adicionada a tabela recurring_triggers com sucesso.")
    except Exception as e:
        print(f"[ERRO] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()

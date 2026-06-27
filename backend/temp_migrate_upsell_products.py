"""
Migration: Add upsell_products column to webhook_integrations table.
Run once: python temp_migrate_upsell_products.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        db.execute(text("""
            ALTER TABLE webhook_integrations
            ADD COLUMN IF NOT EXISTS upsell_products JSONB DEFAULT '[]'::jsonb;
        """))
        db.commit()
        print("✅ Migration concluída: coluna 'upsell_products' adicionada a webhook_integrations.")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro na migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

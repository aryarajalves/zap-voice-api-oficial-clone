"""
Migration: create roulette_logs table
Run once: python backend/scripts/database/create_roulette_table.py
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
                CREATE TABLE IF NOT EXISTS roulette_logs (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER NOT NULL,
                    phone VARCHAR NOT NULL,
                    funnel_id INTEGER NOT NULL,
                    node_id VARCHAR NOT NULL,
                    win_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_roulette_logs_client_id ON roulette_logs(client_id);
                CREATE INDEX IF NOT EXISTS idx_roulette_logs_phone ON roulette_logs(phone);
                CREATE INDEX IF NOT EXISTS idx_roulette_logs_win_date ON roulette_logs(win_date);
            """))
        else:
            # SQLite
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS roulette_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER NOT NULL,
                    phone TEXT NOT NULL,
                    funnel_id INTEGER NOT NULL,
                    node_id TEXT NOT NULL,
                    win_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_roulette_logs_client_id ON roulette_logs(client_id);
                CREATE INDEX IF NOT EXISTS idx_roulette_logs_phone ON roulette_logs(phone);
                CREATE INDEX IF NOT EXISTS idx_roulette_logs_win_date ON roulette_logs(win_date);
            """))
        db.commit()
        print("✅ Tabela 'roulette_logs' criada com sucesso.")
    except Exception as e:
        print(f"⚠️  {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()

"""
Migration: create round_robin_states table
Run once: python backend/scripts/database/create_round_robin_table.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

db_url = os.getenv("DATABASE_URL")
if db_url:
    if "zapvoice-postgres:5432" in db_url:
        os.environ["DATABASE_URL"] = db_url.replace("zapvoice-postgres:5432", "localhost:5435")
    elif "zapvoice-postgres" in db_url:
        os.environ["DATABASE_URL"] = db_url.replace("zapvoice-postgres", "localhost")

from database import SessionLocal
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        dialect = db.bind.dialect.name
        if dialect == 'postgresql':
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS round_robin_states (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER NOT NULL,
                    funnel_id INTEGER NOT NULL,
                    node_id VARCHAR NOT NULL,
                    last_path_id VARCHAR NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_round_robin_states_client_funnel_node ON round_robin_states(client_id, funnel_id, node_id);
            """))
        else:
            # SQLite
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS round_robin_states (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER NOT NULL,
                    funnel_id INTEGER NOT NULL,
                    node_id TEXT NOT NULL,
                    last_path_id TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_round_robin_states_client_funnel_node ON round_robin_states(client_id, funnel_id, node_id);
            """))
        db.commit()
        print("Tabela 'round_robin_states' criada com sucesso.")
    except Exception as e:
        print(f"Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()

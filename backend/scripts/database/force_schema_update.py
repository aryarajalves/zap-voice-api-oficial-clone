
import os
import time
import random
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

def force_database_schema():
    """Forces schema update with retries and aggressive locking"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found.")
        return

    print(f"🔥 INICIANDO ATUALIZAÇÃO FORÇADA DE ESQUEMA PARA: {database_url.split('@')[1] if '@' in database_url else 'unknown'}")
    print("⚠️ Este script vai tentar travar a tabela 'scheduled_triggers' para adicionar a coluna 'current_step_index'.")
    print("⚠️ Se houver muitos processos rodando, pode levar alguns instantes.")

    engine = create_engine(database_url, connect_args={"connect_timeout": 10})

    columns_to_add = [
         ("scheduled_triggers", "current_step_index", "INTEGER", "DEFAULT 0")
    ]
    
    # Adjust for SQLite if necessary
    is_sqlite = database_url.startswith("sqlite")

    max_retries = 10
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                with conn.begin():
                    # No lock timeout here - we wait as long as needed or until DB kills us
                    # But to be safe against deadlocks, we might want a generous timeout or just retry
                    if not is_sqlite:
                        conn.execute(text("SET lock_timeout = '30s'")) # 30s wait time
                    
                    for table, column, col_type, extra in columns_to_add:
                        if is_sqlite:
                            result = conn.execute(text(f"PRAGMA table_info({table})"))
                            existing_cols = [row[1] for row in result.fetchall()]
                        else:
                            result = conn.execute(text(
                                f"SELECT column_name FROM information_schema.columns "
                                f"WHERE table_name='{table}' AND column_name='{column}'"
                            ))
                            existing_cols = [row[0] for row in result.fetchall()]

                        if column not in existing_cols:
                            print(f"attempt {attempt+1}/{max_retries}: ➕ Adding column '{column}' to table '{table}'...", flush=True)
                            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} {extra}"))
                            print(f"✅ Column '{column}' added successfully!", flush=True)
                        else:
                            print(f"ℹ️ Column '{column}' already exists.", flush=True)
            
            print("🚀 Schema update finished.")
            return

        except Exception as e:
            print(f"❌ Attempt {attempt+1} failed: {e}", flush=True)
            wait = random.uniform(2, 5)
            print(f"Waiting {wait:.1f}s before retry...", flush=True)
            time.sleep(wait)

    print("❌ FAILED to update schema after multiple attempts.")

if __name__ == "__main__":
    force_database_schema()

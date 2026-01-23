import os
import sys
import time
import random
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

def update_database_schema():
    """Adds missing columns to existing tables if they don't exist"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found. Skipping schema update.", flush=True)
        return

    # Sono aleatório curto para evitar que múltiplos containers tentem migrar no exato mesmo segundo
    wait_time = random.uniform(0, 5)
    print(f"⏳ Aguardando {wait_time:.1f}s para evitar conflitos de migração...", flush=True)
    time.sleep(wait_time)

    print(f"🔍 Checking database schema for: {database_url.split('@')[1] if '@' in database_url else 'unknown'}", flush=True)
    engine = create_engine(database_url, connect_args={"connect_timeout": 10})

    columns_to_add = [
        ("scheduled_triggers", "processed_contacts", "JSONB", "DEFAULT '[]'::jsonb"), # Use JSONB for Postgres
        ("scheduled_triggers", "pending_contacts", "JSONB", "DEFAULT '[]'::jsonb"),
        ("scheduled_triggers", "updated_at", "TIMESTAMP WITH TIME ZONE", "DEFAULT NOW()"),
        ("scheduled_triggers", "total_delivered", "INTEGER", "DEFAULT 0"),
        ("scheduled_triggers", "current_step_index", "INTEGER", "DEFAULT 0"),
        ("users", "role", "VARCHAR", "DEFAULT 'user'")
    ]

    # Adjust for SQLite if necessary (though production is Postgres)
    is_sqlite = database_url.startswith("sqlite")
    if is_sqlite:
        columns_to_add = [
            ("scheduled_triggers", "processed_contacts", "JSON", "DEFAULT '[]'"),
            ("scheduled_triggers", "pending_contacts", "JSON", "DEFAULT '[]'"),
            ("scheduled_triggers", "updated_at", "DATETIME", "NULL"),
            ("scheduled_triggers", "total_delivered", "INTEGER", "DEFAULT 0")
        ]

    with engine.connect() as conn:
        with conn.begin() as trans:
            # Configurar lock_timeout para não travar o container se o banco estiver ocupado
            if not is_sqlite:
                try:
                    conn.execute(text("SET lock_timeout = '15s'"))
                    print("🔒 Lock timeout configurado para 15s.", flush=True)
                except Exception as e:
                    print(f"⚠️ Não foi possível configurar lock_timeout: {e}", flush=True)

            for table, column, col_type, extra in columns_to_add:
                try:
                    # Check if column exists
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
                        print(f"➕ Adding column '{column}' to table '{table}'...", flush=True)
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} {extra}"))
                        print(f"✅ Column '{column}' added.", flush=True)
                    else:
                        print(f"ℹ️ Column '{column}' already exists in table '{table}'.", flush=True)
                except Exception as e:
                    print(f"⚠️ Could not add column '{column}': {e}", flush=True)
            
            # Commit é automático ao sair do bloco 'with conn.begin()'
            print("🚀 Schema update completed.", flush=True)

    # Garantir que a tabela user_clients existe (Muitos-para-Muitos)
    with engine.connect() as conn:
        with conn.begin() as trans:
            try:
                if is_sqlite:
                    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='user_clients'"))
                else:
                    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='user_clients'"))
                
                if not result.fetchone():
                    print("➕ Creating 'user_clients' association table...", flush=True)
                    conn.execute(text("""
                        CREATE TABLE user_clients (
                            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                            PRIMARY KEY (user_id, client_id)
                        )
                    """))
                    print("✅ Table 'user_clients' created.", flush=True)
            except Exception as e:
                print(f"⚠️ Error ensuring 'user_clients' table: {e}", flush=True)

if __name__ == "__main__":
    update_database_schema()

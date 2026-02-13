import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Add backend directory to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(backend_path)

# Load .env from project root
# .env is in ../../ relative to this script (backend/scripts/migrate_dm.py)
env_path = os.path.abspath(os.path.join(backend_path, '../.env'))
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL not found!")
    sys.exit(1)

if "zapvoice-postgres" in db_url:
    print("⚠️ Detected docker service name in DATABASE_URL. Switching to localhost for local migration...")
    db_url = db_url.replace("zapvoice-postgres", "localhost")

print(f"Connecting to database...")

engine = create_engine(db_url)

def migrate():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('scheduled_triggers')]
    
    with engine.connect() as conn:
        with conn.begin():
            if 'direct_message' not in columns:
                print("Adding direct_message column...")
                conn.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN direct_message TEXT"))
            else:
                print("Column direct_message already exists.")

            if 'direct_message_params' not in columns:
                print("Adding direct_message_params column...")
                # Determine type
                is_postgres = 'postgresql' in db_url
                col_type = "JSONB" if is_postgres else "TEXT" # JSONB is better for PG
                conn.execute(text(f"ALTER TABLE scheduled_triggers ADD COLUMN direct_message_params {col_type}"))
            else:
                print("Column direct_message_params already exists.")
    
    print("✅ Migration completed successfully.")

if __name__ == "__main__":
    migrate()

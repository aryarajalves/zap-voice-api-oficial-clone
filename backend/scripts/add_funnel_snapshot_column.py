import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def migrate():
    engine = create_engine(DATABASE_URL)
    table_name = "scheduled_triggers"
    col_name = "funnel_snapshot"
    col_type = "JSONB"

    print(f"Connecting to database to add '{col_name}' column to '{table_name}'...")
    with engine.connect() as conn:
        # Check if column exists
        check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}' AND column_name='{col_name}'")
        result = conn.execute(check_sql).fetchone()
        
        if result:
            print(f"Column '{col_name}' already exists in '{table_name}'.")
        else:
            print(f"Adding column '{col_name}' to '{table_name}'...")
            try:
                with engine.begin() as transaction_conn:
                    transaction_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                print(f"Column '{col_name}' added successfully.")
            except Exception as e:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    migrate()

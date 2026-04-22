from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def debug_columns(table_name):
    engine = create_engine(DATABASE_URL)
    print(f"\n--- COLUMNS FOR TABLE: {table_name} ---")
    try:
        with engine.connect() as conn:
            query = text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table_name}' ORDER BY column_name")
            result = conn.execute(query)
            cols = result.fetchall()
            if not cols:
                print("Table not found or no columns.")
            for col in cols:
                print(f"{col[0]}: {col[1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_columns("scheduled_triggers")
    debug_columns("webhook_event_mappings")

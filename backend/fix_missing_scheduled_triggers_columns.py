import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def fix_scheduled_triggers_schema():
    engine = create_engine(DATABASE_URL)
    
    columns_to_add = [
        ("publish_external_event", "BOOLEAN DEFAULT FALSE", "scheduled_triggers"),
        ("event_type", "VARCHAR", "scheduled_triggers"),
        ("integration_id", "UUID", "scheduled_triggers"),
        ("label_added", "BOOLEAN DEFAULT FALSE", "scheduled_triggers"),
        ("updated_at", "TIMESTAMP WITH TIME ZONE", "scheduled_triggers"),
        ("cancel_events", "JSONB DEFAULT '[]'::jsonb", "webhook_event_mappings")
    ]

    with engine.connect() as conn:
        for col_name, col_type, table_name in columns_to_add:
            # Check if column exists
            check_sql = text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table_name}' AND column_name='{col_name}'")
            result = conn.execute(check_sql).fetchone()
            
            if result:
                current_type = result[1]
                print(f"Column '{col_name}' exists in '{table_name}' (Type: {current_type}).")
                # If it's JSON but we want JSONB, alter it
                if "json" in current_type.lower() and "jsonb" not in current_type.lower() and "jsonb" in col_type.lower():
                    print(f"Altering column '{col_name}' to JSONB...")
                    try:
                        with engine.begin() as transaction_conn:
                            transaction_conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {col_name} TYPE JSONB USING {col_name}::jsonb"))
                        print(f"Column '{col_name}' altered successfully.")
                    except Exception as e:
                        print(f"Error altering column '{col_name}': {e}")
            else:
                print(f"Adding column '{col_name}' to '{table_name}'...")
                try:
                    with engine.begin() as transaction_conn:
                        transaction_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                    print(f"Column '{col_name}' added successfully.")
                except Exception as e:
                    print(f"Error adding column '{col_name}' to '{table_name}': {e}")

    print("Schema update for 'scheduled_triggers' complete.")

if __name__ == "__main__":
    fix_scheduled_triggers_schema()

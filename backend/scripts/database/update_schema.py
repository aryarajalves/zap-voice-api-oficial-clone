
import os
import psycopg2
from urllib.parse import urlparse

def update_schema():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice")
    if database_url:
        database_url = database_url.strip('"').strip("'")
    print(f"Connecting to {database_url}...")
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # List of columns to add to scheduled_triggers
        columns_to_add = [
            ("current_node_id", "VARCHAR"),
            ("processed_contacts", "JSON"),
            ("pending_contacts", "JSON"),
            ("cost_per_unit", "FLOAT DEFAULT 0.0"),
            ("total_cost", "FLOAT DEFAULT 0.0"),
            ("total_delivered", "INTEGER DEFAULT 0"),
            ("total_read", "INTEGER DEFAULT 0"),
            ("total_interactions", "INTEGER DEFAULT 0"),
            ("total_blocked", "INTEGER DEFAULT 0"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE"),
            ("private_message", "VARCHAR"),
            ("private_message_delay", "INTEGER DEFAULT 5"),
            ("private_message_delay", "INTEGER DEFAULT 5"),
            ("private_message_concurrency", "INTEGER DEFAULT 1"),
            ("template_language", "VARCHAR DEFAULT 'pt_BR'"),
            ("template_components", "JSON"),
            ("direct_message", "VARCHAR"),
            ("direct_message_params", "JSON"),
            ("current_step_index", "INTEGER DEFAULT 0"),
            ("failure_reason", "VARCHAR")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # Usa tabela scheduled_triggers
                cur.execute(f"ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.commit()
                print(f"✅ Column {col_name} checked/added to scheduled_triggers.")
            except Exception as e:
                conn.rollback()
                print(f"❌ Error adding column {col_name}: {e}")

        # Update MessageStatus table
        ms_columns = [
            ("pending_private_note", "VARCHAR"),
            ("message_type", "VARCHAR"),
            ("private_note_posted", "BOOLEAN DEFAULT FALSE"),
            ("failure_reason", "VARCHAR"),
            ("is_interaction", "BOOLEAN DEFAULT FALSE")
        ]
        
        for col_name, col_type in ms_columns:
            try:
                cur.execute(f"ALTER TABLE message_status ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.commit()
                print(f"✅ Column {col_name} checked/added to message_status.")
            except Exception as e:
                conn.rollback()
                print(f"❌ Error adding column {col_name} to message_status: {e}")


        cur.close()
        conn.close()
        print("Done!")
        
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    update_schema()

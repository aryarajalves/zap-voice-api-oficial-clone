import sqlite3

db_file = "sql_app.db"

def add_column_if_not_exists(cursor, table_name, column_name, column_type):
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [info[1] for info in cursor.fetchall()]
    if column_name not in columns:
        print(f"Adding column {column_name} to {table_name}...")
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
    else:
        print(f"Column {column_name} already exists in {table_name}.")

def create_table_if_not_exists(cursor, table_name, create_sql):
    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
    if not cursor.fetchone():
        print(f"Creating table {table_name}...")
        cursor.execute(create_sql)
    else:
        print(f"Table {table_name} already exists.")

def migrate():
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    try:
        # Add total_delivered column
        add_column_if_not_exists(cursor, "scheduled_triggers", "total_delivered", "INTEGER DEFAULT 0")
        
        # Create message_status table
        create_table_if_not_exists(cursor, "message_status", """
            CREATE TABLE message_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_id INTEGER,
                message_id TEXT UNIQUE,
                phone_number TEXT,
                status TEXT DEFAULT 'sent',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (trigger_id) REFERENCES scheduled_triggers(id)
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_message_status_trigger_id ON message_status(trigger_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON message_status(message_id)")
        
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

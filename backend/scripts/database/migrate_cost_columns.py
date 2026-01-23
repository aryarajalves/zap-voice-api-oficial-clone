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

def migrate():
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    try:
        add_column_if_not_exists(cursor, "scheduled_triggers", "cost_per_unit", "FLOAT DEFAULT 0.0")
        add_column_if_not_exists(cursor, "scheduled_triggers", "total_cost", "FLOAT DEFAULT 0.0")
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

import sqlite3

db_file = "sql_app.db"

def add_column():
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    try:
        print("Attempting to add template_language column...")
        cursor.execute("ALTER TABLE scheduled_triggers ADD COLUMN template_language VARCHAR DEFAULT 'pt_BR'")
        conn.commit()
        print("Column 'template_language' added successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error (column might already exist): {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()


import sqlite3
import os

db_path = "backend/database.db"
if not os.path.exists(db_path):
    print("Database not found at backend/database.db")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding columns to message_status...")
    cursor.execute("ALTER TABLE message_status ADD COLUMN chatwoot_conversation_id INTEGER")
    cursor.execute("ALTER TABLE message_status ADD COLUMN chatwoot_account_id INTEGER")
    cursor.execute("ALTER TABLE message_status ADD COLUMN chatwoot_inbox_id INTEGER")
    conn.commit()
    print("Columns added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error or columns already exist: {e}")
finally:
    conn.close()

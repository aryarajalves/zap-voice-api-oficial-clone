import sqlite3

# Connect to the database
conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

# Add new columns to scheduled_triggers table
try:
    cursor.execute("ALTER TABLE scheduled_triggers ADD COLUMN delay_seconds INTEGER DEFAULT 5")
    print("Added delay_seconds column.")
except sqlite3.OperationalError:
    print("delay_seconds column already exists.")

try:
    cursor.execute("ALTER TABLE scheduled_triggers ADD COLUMN concurrency_limit INTEGER DEFAULT 1")
    print("Added concurrency_limit column.")
except sqlite3.OperationalError:
    print("concurrency_limit column already exists.")

conn.commit()
conn.close()

import sqlite3
import os

db_path = 'backend/database.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("# Database Schema Audit\n")

for table in tables:
    table_name = table[0]
    print(f"## Table: {table_name}")
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    print("| ID | Name | Type | NotNull | PK |")
    print("|---|---|---|---|---|")
    for col in columns:
        # col format: (id, name, type, notnull, default_value, pk)
        print(f"| {col[0]} | {col[1]} | {col[2]} | {col[3]} | {col[5]} |")
    print("\n")

conn.close()

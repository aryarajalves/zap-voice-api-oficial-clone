
import os
import psycopg2
from urllib.parse import urlparse

def check_columns():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/zapvoice")
    if database_url:
        database_url = database_url.strip('"').strip("'")
    
    print(f"Connecting to {database_url}...")
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        tables = ["scheduled_triggers", "message_status"]
        
        for table in tables:
            print(f"\n--- Columns in table '{table}' ---")
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}';")
            rows = cur.fetchall()
            for row in rows:
                print(f"  - {row[0]} ({row[1]})")
                
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    check_columns()

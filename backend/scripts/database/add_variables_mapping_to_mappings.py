
import os
import psycopg2
from dotenv import load_dotenv

def run_migration():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        print("Adding column 'variables_mapping' to 'webhook_event_mappings'...")
        cur.execute("ALTER TABLE webhook_event_mappings ADD COLUMN IF NOT EXISTS variables_mapping JSON;")
        
        conn.commit()
        print("Migration completed successfully!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    run_migration()

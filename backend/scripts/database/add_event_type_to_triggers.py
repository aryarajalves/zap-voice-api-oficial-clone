
import os
import psycopg2
from dotenv import load_dotenv

def migrate():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Check if column exists
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='scheduled_triggers' AND column_name='event_type';")
        if cur.fetchone():
            print("Column 'event_type' already exists in 'scheduled_triggers'.")
        else:
            print("Adding 'event_type' column to 'scheduled_triggers'...")
            cur.execute("ALTER TABLE scheduled_triggers ADD COLUMN event_type VARCHAR;")
            print("Column added successfully.")
        
        conn.commit()
        cur.close()
        conn.close()
        print("Migration completed.")
        
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()

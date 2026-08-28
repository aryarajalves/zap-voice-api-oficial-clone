import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://zapvoice:zapvoice@postgres:5432/zapvoice")

def run_migration():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Creating index idx_chat_messages_starred on chat_messages (conversation_id, is_starred, timestamp)...")
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_messages_starred 
                ON chat_messages (conversation_id, is_starred, timestamp DESC);
            """))
            conn.commit()
            print("Index idx_chat_messages_starred created or already exists.")
        except Exception as e:
            print(f"Error creating idx_chat_messages_starred: {e}")

        print("Migration finished successfully.")

if __name__ == "__main__":
    run_migration()

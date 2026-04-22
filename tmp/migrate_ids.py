
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Migrating scheduled_triggers table...")
    try:
        conn.execute(text('ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS chatwoot_contact_id BIGINT'))
        conn.execute(text('ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS chatwoot_account_id INTEGER'))
        conn.execute(text('ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS chatwoot_inbox_id INTEGER'))
        conn.commit()
        print("Migration concluded successfully!")
    except Exception as e:
        print(f"Error during migration: {e}")

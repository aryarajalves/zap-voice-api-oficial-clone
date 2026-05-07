import os
from sqlalchemy import create_engine, text
from database import engine

def check():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'webhook_event_mappings' AND column_name = 'chatwoot_label'")).fetchone()
        print(f"COLUNA: {res}")

if __name__ == "__main__":
    check()

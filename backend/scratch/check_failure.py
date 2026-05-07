import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
trigger_id = 359

with engine.connect() as conn:
    res = conn.execute(text("SELECT failure_reason FROM scheduled_triggers WHERE id = :id"), {"id": trigger_id}).fetchone()
    if res:
        print(f"Failure Reason for Trigger {trigger_id}: {res.failure_reason}")

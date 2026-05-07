from sqlalchemy import create_engine, text
from datetime import datetime, timezone, timedelta
engine = create_engine('postgresql://postgres:postgres@localhost:5435/zapvoice')
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, status, updated_at FROM message_status WHERE status != 'sent' AND updated_at >= :t"), {"t": datetime.now(timezone.utc) - timedelta(minutes=15)}).fetchall()
    for row in res:
        print(f"ID: {row[0]} | Status: {row[1]} | Time: {row[2]}")

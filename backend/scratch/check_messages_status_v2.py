from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5435/zapvoice')
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, message_id, status FROM message_status ORDER BY id DESC LIMIT 5")).fetchall()
    for row in res:
        print(f"ID: {row[0]} | MSG_ID: {row[1]} | Status: {row[2]}")

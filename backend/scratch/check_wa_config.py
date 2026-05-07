from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5435/zapvoice')
with engine.connect() as conn:
    res = conn.execute(text("SELECT client_id, key, value FROM app_config WHERE key LIKE 'WA_%'")).fetchall()
    for row in res:
        print(f"Client: {row[0]} | Key: {row[1]} | Value: {row[2]}")

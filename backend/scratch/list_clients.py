from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5435/zapvoice')
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, name FROM clients")).fetchall()
    for row in res:
        print(f"ID: {row[0]} | Name: {row[1]}")

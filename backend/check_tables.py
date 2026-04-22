
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = "postgresql://postgres:postgres@localhost:5435/zapvoice"
if not db_url:
    print("DATABASE_URL not found")
    exit(1)

engine = create_engine(db_url)
with engine.connect() as conn:
    # List all tables
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    tables = [row[0] for row in result]
    print(f"Tables: {tables}")
    
    # Check counts if tables exist
    for table in ["contatos_monitorados", "LeadInfo_JanelaDe24H"]:
        if table in tables:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"Table {table}: {count} rows")
        else:
            print(f"Table {table} does not exist")

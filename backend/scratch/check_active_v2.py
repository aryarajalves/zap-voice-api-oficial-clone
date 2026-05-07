import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    exit(1)

engine = create_engine(DATABASE_URL)
integration_id = '40cef9fa-6904-4c83-9a92-28108f5337a6'

with engine.connect() as conn:
    # Check Integration
    res = conn.execute(text("SELECT id, name, status, client_id FROM webhook_integrations WHERE id = :id"), {"id": integration_id}).fetchone()
    if res:
        print(f"Integration: {res.name}")
        print(f"ID (type: {type(res.id)}): {res.id}")
        print(f"Status: {res.status}")
        print(f"Client ID: {res.client_id}")
    else:
        print("❌ Integration not found in DB")
        # List all integrations to see what's there
        all_res = conn.execute(text("SELECT id, name, status FROM webhook_integrations")).fetchall()
        print(f"All Integrations in DB ({len(all_res)}):")
        for i in all_res:
            print(f" - {i.name} (ID: {i.id}, Status: {i.status})")

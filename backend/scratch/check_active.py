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
    res = conn.execute(text("SELECT id, name, is_active, client_id FROM webhook_integrations WHERE id = :id"), {"id": integration_id}).fetchone()
    if res:
        print(f"Integration: {res.name} (ID: {res.id})")
        print(f"Is Active: {res.is_active}")
        print(f"Client ID: {res.client_id}")
    else:
        print("❌ Integration not found in DB")

    # Check Mappings
    res = conn.execute(text("SELECT id, event_type, is_active FROM webhook_event_mappings WHERE integration_id = :id"), {"id": integration_id}).fetchall()
    print(f"Mappings found: {len(res)}")
    for m in res:
        print(f" - {m.event_type} (Active: {m.is_active})")

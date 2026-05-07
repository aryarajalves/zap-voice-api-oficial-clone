import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
history_id = 497

with engine.connect() as conn:
    # Check History
    res = conn.execute(text("SELECT id, status, processed_data FROM webhook_history WHERE id = :id"), {"id": history_id}).fetchone()
    if res:
        print(f"History ID: {res.id}")
        print(f"Status: {res.status}")
        print(f"Processed Data: {res.processed_data}")
    else:
        print(f"❌ History {history_id} not found")

    # Check Triggers
    res = conn.execute(text("SELECT id, contact_name, contact_phone, product_name, status FROM scheduled_triggers WHERE integration_id = (SELECT id FROM webhook_integrations WHERE name = 'Plataforma Kiwify' LIMIT 1) ORDER BY created_at DESC LIMIT 1")).fetchone()
    if res:
        print("\nLast Trigger for Kiwify:")
        print(f" - ID: {res.id}")
        print(f" - Name: {res.contact_name}")
        print(f" - Phone: {res.contact_phone}")
        print(f" - Product: {res.product_name}")
        print(f" - Status: {res.status}")
    else:
        print("\n❌ No triggers found for Kiwify")

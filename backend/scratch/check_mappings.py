import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
integration_id = '10c8dac2-a3b0-473a-8786-fb1e674d13eb'

with engine.connect() as conn:
    # Check Mappings
    res = conn.execute(text("SELECT id, event_type, is_active, funnel_id, template_name FROM webhook_event_mappings WHERE integration_id = :id"), {"id": integration_id}).fetchall()
    print(f"Mappings for {integration_id} ({len(res)}):")
    for m in res:
        print(f" - {m.event_type} | Funil: {m.funnel_id} | Template: {m.template_name} | Active: {m.is_active}")

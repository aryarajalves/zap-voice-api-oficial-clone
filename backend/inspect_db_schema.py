import os
from sqlalchemy import create_engine, inspect
from database import SQLALCHEMY_DATABASE_URL

def inspect_table(table_name):
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    print(f"\nColumns in {table_name}:")
    for c in columns:
        print(f" - {c['name']}: {c['type']}")

if __name__ == "__main__":
    inspect_table("scheduled_triggers")
    inspect_table("webhook_event_mappings")
    inspect_table("message_status")


from sqlalchemy import create_url, create_engine, inspect
import os

# Try to get database URL from env
db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/zapvoice")

engine = create_engine(db_url)
inspector = inspect(engine)

tables = ["scheduled_triggers", "webhook_history", "webhook_integrations", "webhook_event_mappings"]

for table in tables:
    print(f"\nTable: {table}")
    columns = inspector.get_columns(table)
    for column in columns:
        if "integration_id" in column["name"] or column["name"] == "id":
             print(f"  - {column['name']}: {column['type']}")


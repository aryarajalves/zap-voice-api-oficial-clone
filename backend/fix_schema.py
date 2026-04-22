import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice"

def fix_schema():
    engine = create_engine(DATABASE_URL)
    
    commands = [
        # Table: webhook_event_mappings
        ("SELECT delay_seconds FROM webhook_event_mappings LIMIT 1", 
         "ALTER TABLE webhook_event_mappings ADD COLUMN delay_seconds INTEGER DEFAULT 0"),
        
        ("SELECT private_note FROM webhook_event_mappings LIMIT 1", 
         "ALTER TABLE webhook_event_mappings ADD COLUMN private_note TEXT DEFAULT ''"),
         
        # Table: webhook_history
        ("SELECT processed_data FROM webhook_history LIMIT 1", 
         "ALTER TABLE webhook_history ADD COLUMN processed_data JSONB DEFAULT '{}'::jsonb")
    ]

    with engine.connect() as conn:
        for check, alter in commands:
            try:
                print(f"Checking: {check}")
                conn.execute(text(check))
                print("Already exists.")
            except Exception as e:
                # conn.rollback() # SQLAlchemy 2.0 handled in context usually
                print(f"Missing. Running: {alter}")
                try:
                    with engine.begin() as transaction_conn:
                        transaction_conn.execute(text(alter))
                    print("Fixed successfully.")
                except Exception as ex:
                    print(f"Error fixing: {ex}")

    print("Schema check complete.")

if __name__ == "__main__":
    fix_schema()

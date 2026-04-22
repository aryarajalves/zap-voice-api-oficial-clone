import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in environment")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Checking current status of recurring_triggers...")
    try:
        # Check if the column exists and what type it is
        res = conn.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'recurring_triggers' AND column_name = 'day_of_month';
        """)).fetchone()
        
        if res and res[0] != 'jsonb' and res[0] != 'json':
            print(f"Current type is {res[0]}. Migrating to jsonb...")
            # Alter column type
            # We use to_jsonb and wrap in array if it was an integer
            conn.execute(text("""
                ALTER TABLE recurring_triggers 
                ALTER COLUMN day_of_month TYPE JSONB 
                USING CASE 
                    WHEN day_of_month IS NULL THEN NULL
                    ELSE jsonb_build_array(day_of_month::int)
                END;
            """))
            conn.commit()
            print("Migration successful!")
        else:
            print(f"Column type is {res[0] if res else 'None'}, no migration needed.")
            
    except Exception as e:
        print(f"Migration error: {e}")

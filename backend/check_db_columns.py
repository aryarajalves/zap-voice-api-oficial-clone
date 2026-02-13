from sqlalchemy import create_engine, inspect, text
import os

# Hardcoded local connection for inspection script
# Adjust password if needed (default in docker-compose is usually postgres/postgres)
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/zapvoice"

def check_columns():
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('webhook_configs')]
        print(f"Columns in webhook_configs: {columns}")
        
        missing = []
        if 'delay_amount' not in columns:
            missing.append('delay_amount')
        if 'delay_unit' not in columns:
            missing.append('delay_unit')
            
        if missing:
            print(f"Missing columns: {missing}")
            with engine.connect() as conn:
                for col in missing:
                    if col == 'delay_amount':
                        print("Adding delay_amount...")
                        conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN delay_amount INTEGER DEFAULT 0"))
                    elif col == 'delay_unit':
                        print("Adding delay_unit...")
                        # Default to 'seconds'
                        conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN delay_unit VARCHAR DEFAULT 'seconds'"))
                conn.commit()
                print("Columns added successfully.")
        else:
            print("All columns present.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()

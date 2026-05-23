from database import engine
from sqlalchemy import text, inspect

def run_migration():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns("scheduled_triggers")]
    
    with engine.connect() as conn:
        # Coluna is_recurring
        if "is_recurring" not in columns:
            print("Adding column 'is_recurring' to 'scheduled_triggers'...")
            try:
                with engine.begin() as trans:
                    trans.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE"))
                print("Column 'is_recurring' added successfully.")
            except Exception as e:
                print(f"Error adding 'is_recurring': {e}")
        else:
            print("Column 'is_recurring' already exists.")
            
        # Coluna recurring_trigger_id
        if "recurring_trigger_id" not in columns:
            print("Adding column 'recurring_trigger_id' to 'scheduled_triggers'...")
            try:
                with engine.begin() as trans:
                    trans.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN recurring_trigger_id INTEGER REFERENCES recurring_triggers(id) ON DELETE SET NULL"))
                print("Column 'recurring_trigger_id' added successfully.")
            except Exception as e:
                print(f"Error adding 'recurring_trigger_id': {e}")
        else:
            print("Column 'recurring_trigger_id' already exists.")

if __name__ == "__main__":
    run_migration()

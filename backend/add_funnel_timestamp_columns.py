from database import engine
from sqlalchemy import text, inspect

def run_migration():
    inspector = inspect(engine)
    if "funnels" not in inspector.get_table_names():
        print("❌ Table 'funnels' does not exist yet.")
        return

    columns = [c['name'] for c in inspector.get_columns("funnels")]
    
    with engine.connect() as conn:
        # Column created_at
        if "created_at" not in columns:
            print("Adding column 'created_at' to 'funnels'...")
            try:
                with engine.begin() as trans:
                    if engine.url.drivername.startswith("sqlite"):
                        trans.execute(text("ALTER TABLE funnels ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    else:
                        trans.execute(text("ALTER TABLE funnels ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
                print("✅ Column 'created_at' added successfully.")
            except Exception as e:
                print(f"❌ Error adding 'created_at': {e}")
        else:
            print("Column 'created_at' already exists.")
            
        # Column updated_at
        if "updated_at" not in columns:
            print("Adding column 'updated_at' to 'funnels'...")
            try:
                with engine.begin() as trans:
                    if engine.url.drivername.startswith("sqlite"):
                        trans.execute(text("ALTER TABLE funnels ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    else:
                        trans.execute(text("ALTER TABLE funnels ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
                print("✅ Column 'updated_at' added successfully.")
            except Exception as e:
                print(f"❌ Error adding 'updated_at': {e}")
        else:
            print("Column 'updated_at' already exists.")

if __name__ == "__main__":
    run_migration()

"""
Migration: Add Multi-Client Support
Date: 2026-01-21

This migration:
1. Creates the 'clients' table
2. Inserts a default client (using existing CLIENT_NAME from app_config)
3. Adds client_id columns to funnels, scheduled_triggers, and app_config
4. Migrates existing data to the default client
5. Adds foreign key constraints
"""

import os
import sys
from sqlalchemy import create_engine, text, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add parent directory to path so we can import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal

def run_migration():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("MULTI-CLIENT MIGRATION - Starting")
        print("=" * 60)
        
        # Step 1: Create clients table
        print("\n[1/6] Creating 'clients' table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        db.commit()
        print("✅ Clients table created")
        
        # Step 2: Get CLIENT_NAME from app_config or use default
        print("\n[2/6] Fetching existing client name...")
        result = db.execute(text("SELECT value FROM app_config WHERE key = 'CLIENT_NAME' LIMIT 1"))
        row = result.fetchone()
        default_client_name = row[0] if row else "SalesForce"
        print(f"✅ Using client name: '{default_client_name}'")
        
        # Step 3: Insert default client
        print("\n[3/6] Creating default client...")
        result = db.execute(
            text("INSERT INTO clients (name) VALUES (:name) ON CONFLICT (name) DO NOTHING RETURNING id"),
            {"name": default_client_name}
        )
        client_row = result.fetchone()
        
        if client_row:
            default_client_id = client_row[0]
            print(f"✅ Default client created with ID: {default_client_id}")
        else:
            # Client already exists, fetch its ID
            result = db.execute(text("SELECT id FROM clients WHERE name = :name"), {"name": default_client_name})
            default_client_id = result.fetchone()[0]
            print(f"✅ Using existing client with ID: {default_client_id}")
        
        db.commit()
        
        # Step 4: Add client_id columns to tables (nullable at first)
        print("\n[4/6] Adding client_id columns...")
        
        # Add to funnels
        print("  - Adding client_id to 'funnels'...")
        db.execute(text("ALTER TABLE funnels ADD COLUMN IF NOT EXISTS client_id INTEGER"))
        
        # Add to scheduled_triggers
        print("  - Adding client_id to 'scheduled_triggers'...")
        db.execute(text("ALTER TABLE scheduled_triggers ADD COLUMN IF NOT EXISTS client_id INTEGER"))
        
        # Modify app_config: Rename 'key' column to 'id' if needed, add new structure
        print("  - Modifying 'app_config' structure...")
        
        # Check if app_config already has the new structure
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'app_config' AND column_name = 'id'
        """))
        has_new_structure = result.fetchone() is not None
        
        if not has_new_structure:
            print("  - Migrating app_config to new schema...")
            # Create new table structure
            db.execute(text("""
                CREATE TABLE app_config_new (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER,
                    key VARCHAR NOT NULL,
                    value VARCHAR,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            
            # Copy data
            db.execute(text("""
                INSERT INTO app_config_new (client_id, key, value, updated_at)
                SELECT NULL, key, value, updated_at FROM app_config
            """))
            
            # Drop old table and rename new one
            db.execute(text("DROP TABLE app_config"))
            db.execute(text("ALTER TABLE app_config_new RENAME TO app_config"))
            print("  ✅ app_config migrated to new structure")
        else:
            print("  ✅ app_config already has new structure, ensuring client_id exists...")
            db.execute(text("ALTER TABLE app_config ADD COLUMN IF NOT EXISTS client_id INTEGER"))
        
        db.commit()
        print("✅ Columns added")
        
        # Step 5: Migrate existing data to default client
        print("\n[5/6] Migrating existing data to default client...")
        
        db.execute(
            text("UPDATE funnels SET client_id = :client_id WHERE client_id IS NULL"),
            {"client_id": default_client_id}
        )
        print(f"  - Updated funnels")
        
        db.execute(
            text("UPDATE scheduled_triggers SET client_id = :client_id WHERE client_id IS NULL"),
            {"client_id": default_client_id}
        )
        print(f"  - Updated scheduled_triggers")
        
        db.execute(
            text("UPDATE app_config SET client_id = :client_id WHERE client_id IS NULL"),
            {"client_id": default_client_id}
        )
        print(f"  - Updated app_config")
        
        db.commit()
        print("✅ Data migration complete")
        
        # Step 6: Add NOT NULL constraints and foreign keys
        print("\n[6/6] Adding constraints...")
        
        # Make client_id NOT NULL
        db.execute(text("ALTER TABLE funnels ALTER COLUMN client_id SET NOT NULL"))
        db.execute(text("ALTER TABLE scheduled_triggers ALTER COLUMN client_id SET NOT NULL"))
        db.execute(text("ALTER TABLE app_config ALTER COLUMN client_id SET NOT NULL"))
        
        # Add indexes
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_funnels_client_id ON funnels(client_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_client_id ON scheduled_triggers(client_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_app_config_client_id ON app_config(client_id)"))
        
        # Add foreign keys
        db.execute(text("""
            ALTER TABLE funnels 
            ADD CONSTRAINT fk_funnels_client 
            FOREIGN KEY (client_id) REFERENCES clients(id) 
            ON DELETE CASCADE
        """))
        
        db.execute(text("""
            ALTER TABLE scheduled_triggers 
            ADD CONSTRAINT fk_scheduled_triggers_client 
            FOREIGN KEY (client_id) REFERENCES clients(id) 
            ON DELETE CASCADE
        """))
        
        db.execute(text("""
            ALTER TABLE app_config 
            ADD CONSTRAINT fk_app_config_client 
            FOREIGN KEY (client_id) REFERENCES clients(id) 
            ON DELETE CASCADE
        """))
        
        db.commit()
        print("✅ Constraints added")
        
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY! ✅")
        print("=" * 60)
        print(f"\nDefault client: '{default_client_name}' (ID: {default_client_id})")
        print("All existing data has been assigned to this client.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ MIGRATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

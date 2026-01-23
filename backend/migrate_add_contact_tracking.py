"""
Migration: Add contact tracking fields for cancellation feature

Adds processed_contacts and pending_contacts to scheduled_triggers table
"""

from sqlalchemy import text
from database import engine

def run_migration():
    with engine.connect() as conn:
        # Add processed_contacts column
        try:
            conn.execute(text("""
                ALTER TABLE scheduled_triggers 
                ADD COLUMN IF NOT EXISTS processed_contacts JSON DEFAULT '[]'
            """))
            print("✅ Added processed_contacts column")
        except Exception as e:
            print(f"⚠️  processed_contacts: {e}")
        
        # Add pending_contacts column  
        try:
            conn.execute(text("""
                ALTER TABLE scheduled_triggers 
                ADD COLUMN IF NOT EXISTS pending_contacts JSON DEFAULT '[]'
            """))
            print("✅ Added pending_contacts column")
        except Exception as e:
            print(f"⚠️  pending_contacts: {e}")
        
        # Add updated_at column if not exists
        try:
            conn.execute(text("""
                ALTER TABLE scheduled_triggers 
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
            """))
            print("✅ Added updated_at column")
        except Exception as e:
            print(f"⚠️  updated_at: {e}")
        
        conn.commit()
        print("\n🎉 Migration completed!")

if __name__ == "__main__":
    print("Running migration: add_contact_tracking_fields\n")
    run_migration()

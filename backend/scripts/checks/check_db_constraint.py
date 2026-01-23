from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from database import Base, SQLALCHEMY_DATABASE_URL
import models
import os

# Setup
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def check_constraint():
    inspector = inspect(engine)
    columns = inspector.get_columns('scheduled_triggers')
    for col in columns:
        if col['name'] == 'funnel_id':
            print(f"Column funnel_id: {col}")
            # SQLite 'nullable' key might be present
            if not col.get('nullable', True):
                print("⚠️ funnel_id is NOT NULL in database!")
                return False
            else:
                print("✅ funnel_id is nullable.")
                return True
    return True

if __name__ == "__main__":
    is_nullable = check_constraint()
    
    # Try inserting a test record
    try:
        trigger = models.ScheduledTrigger(
            template_name="TEST_NULL_FUNNEL",
            status='test',
            is_bulk=True,
            funnel_id=None
        )
        db.add(trigger)
        db.commit()
        print("✅ Successfully inserted trigger with funnel_id=None")
        
        # Cleanup
        db.delete(trigger)
        db.commit()
    except Exception as e:
        print(f"❌ Failed to insert trigger with funnel_id=None: {e}")

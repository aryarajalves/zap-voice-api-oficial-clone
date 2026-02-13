
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add backend to sys path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv('backend/.env')

def debug_counts():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL not found in .env")
        return

    url = url.strip('"').strip("'")
    if "zapvoice-postgres" in url:
        url = url.replace("zapvoice-postgres", "localhost")
    
    print(f"Connecting to: {url}")
    engine = create_engine(url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        from models import ScheduledTrigger, MessageStatus

        # Check last trigger
        trigger = db.query(ScheduledTrigger).order_by(ScheduledTrigger.created_at.desc()).first()
        if not trigger:
            print("No triggers found.")
            return

        print(f"Trigger {trigger.id} ({trigger.template_name or trigger.funnel_id}):")
        print(f"  Sent: {trigger.total_sent}")
        print(f"  Delivered: {trigger.total_delivered}")
        print(f"  Cost: {trigger.total_cost}")
        
        # Check messages for this trigger
        messages = db.query(MessageStatus).filter(MessageStatus.trigger_id == trigger.id).all()
        print(f"  Messages in DB ({len(messages)}):")
        for m in messages:
            print(f"    Phone: {m.phone_number} | Status: {m.status} | Type: {m.message_type}")

        # Check contact window table
        sync_table = "contatos_monitorados"
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {sync_table}"))
            count = result.scalar()
            print(f"\nTable {sync_table} found. Rows: {count}")
            
            recent = db.execute(text(f"SELECT * FROM {sync_table} ORDER BY last_interaction_at DESC NULLS LAST LIMIT 5"))
            print("Recent contacts in table:")
            for row in recent:
                # Row is a mapping/tuple
                print(f"  {row}")
        except Exception as e:
            print(f"\nCould not access table {sync_table}: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_counts()

import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@zapvoice-postgres:5432/zapvoice")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def debug_counts():
    db = SessionLocal()
    try:
        # 1. Get Latest Triggers
        print("--- LATEST TRIGGERS ---")
        triggers = db.execute(text("""
            SELECT id, total_sent, total_delivered, total_read, total_cost, total_memory_sent, publish_external_event, template_name, created_at 
            FROM scheduled_triggers 
            ORDER BY id DESC LIMIT 3
        """)).fetchall()
        
        for t in triggers:
            print(f"Trigger {t[0]}: Sent={t[1]}, Deliv={t[2]}, Read={t[3]}, Cost={t[4]}, Memory={t[5]}, PublishExt={t[6]}, Tpl={t[7]}, Created={t[8]}")
            
            # 2. Get Message Statuses for this trigger
            print(f"  --- MESSAGES FOR TRIGGER {t[0]} ---")
            msgs = db.execute(text("""
                SELECT id, message_id, phone_number, status, memory_webhook_status, meta_price_brl, updated_at
                FROM message_status
                WHERE trigger_id = :tid
            """), {"tid": t[0]}).fetchall()
            
            for m in msgs:
                print(f"    Msg {m[0]}: ID={m[1]}, Phone={m[2]}, Status={m[3]}, MemStatus={m[4]}, Price={m[5]}, Updated={m[6]}")
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_counts()

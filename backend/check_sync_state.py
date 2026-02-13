from database import SessionLocal
import models
from sqlalchemy import text

db = SessionLocal()
try:
    print("--- CHATWOOT CONFIGS ---")
    configs = db.query(models.AppConfig).filter(models.AppConfig.key.like('%CHATWOOT%')).all()
    for c in configs:
        print(f"Client: {c.client_id} | Key: {c.key} | Value: {c.value}")
    
    print("\n--- SYNC TABLE ---")
    sync_table = db.query(models.AppConfig).filter(models.AppConfig.key == 'SYNC_CONTACTS_TABLE').first()
    if sync_table:
        table_name = sync_table.value
        print(f"Table Name: {table_name}")
        try:
            count = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
            print(f"Rows in {table_name}: {count}")
        except Exception as e:
            print(f"Error checking table persistence/presence: {e}")
    else:
        print("SYNC_CONTACTS_TABLE not set.")

finally:
    db.close()

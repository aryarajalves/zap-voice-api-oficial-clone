from database import SessionLocal
from models import AppConfig

db = SessionLocal()
try:
    configs = db.query(AppConfig).filter(AppConfig.key.like('S3_%')).all()
    print(f"--- S3 Settings in Database ---")
    if not configs:
        print("No S3 settings found in DB (fallback to .env should be active)")
    for cfg in configs:
        print(f"Client ID: {cfg.client_id} | Key: {cfg.key} | Value: {cfg.value[:10]}...")
finally:
    db.close()

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@127.0.0.1:5435/zapvoice"
from database import SessionLocal
import models

db = SessionLocal()
phone = "5585996123586"
phone_alt = "558596123586"

print("=== MESSAGES AROUND 13:18 ===")
messages = db.query(models.MessageStatus).filter(
    (models.MessageStatus.phone_number == phone) | (models.MessageStatus.phone_number == phone_alt)
).order_by(models.MessageStatus.id.desc()).limit(15).all()

for m in messages:
    print(f"ID: {m.id} | TriggerID: {m.trigger_id} | Type: {m.message_type} | Content: {m.content[:80]} | Status: {m.status} | Timestamp: {m.timestamp}")

db.close()

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@127.0.0.1:5435/zapvoice"
from database import SessionLocal
import models
from datetime import datetime, timedelta, timezone

db = SessionLocal()
cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)

print("=== TRIGGERS CREATED IN THE LAST 15 MINUTES ===")
triggers = db.query(models.ScheduledTrigger).filter(
    models.ScheduledTrigger.updated_at >= cutoff
).order_by(models.ScheduledTrigger.id.desc()).all()

for t in triggers:
    print(f"ID: {t.id} | Funnel: {t.funnel_id} | Template: {t.template_name} | Status: {t.status} | Scheduled: {t.scheduled_time} | Parent: {t.parent_id} | Phone: {t.contact_phone}")

db.close()

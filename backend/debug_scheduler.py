
from database import SessionLocal
import models
from datetime import datetime, timezone

db = SessionLocal()
now = datetime.now(timezone.utc)
print(f"🕒 UTC Agora: {now}")

triggers = db.query(models.ScheduledTrigger).filter(
    models.ScheduledTrigger.status == "pending"
).all()

print(f"📋 Total Pending: {len(triggers)}")

for t in triggers:
    print(f"  👉 ID:{t.id} Time:{t.scheduled_time} <= Now? {t.scheduled_time <= now}")
    if t.scheduled_time <= now:
        print("     ✅ DEVERIA DISPARAR!")
    else:
        print("     ⏳ AINDA NÃO...")

db.close()

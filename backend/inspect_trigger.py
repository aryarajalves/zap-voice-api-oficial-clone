from database import SessionLocal
import models
import json

db = SessionLocal()
trigger = db.query(models.ScheduledTrigger).get(665)
if trigger:
    print(f"Trigger ID: {trigger.id}")
    print(f"Status: {trigger.status}")
    print(f"Failure Reason: {trigger.failure_reason}")
    print("Execution History:")
    print(json.dumps(trigger.execution_history, indent=2))
else:
    print("Trigger 665 not found")
db.close()

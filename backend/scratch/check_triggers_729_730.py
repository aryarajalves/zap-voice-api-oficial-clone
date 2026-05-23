from database import SessionLocal
import models

db = SessionLocal()
t729 = db.query(models.ScheduledTrigger).get(729)
t730 = db.query(models.ScheduledTrigger).get(730)

print("=== Trigger 729 ===")
print("template:", t729.template_name)
print("is_bulk:", t729.is_bulk)
print("publish_external_event:", t729.publish_external_event)

print("=== Trigger 730 ===")
print("template:", t730.template_name)
print("is_bulk:", t730.is_bulk)
print("publish_external_event:", t730.publish_external_event)

db.close()


from database import SessionLocal
import models

db = SessionLocal()
triggers = db.query(models.ScheduledTrigger).all()
for t in triggers:
    print(f"ID: {t.id}, ContactName: {t.contact_name} ({type(t.contact_name)}), Bulk: {t.is_bulk}, Tmpl: {t.template_name}")
db.close()

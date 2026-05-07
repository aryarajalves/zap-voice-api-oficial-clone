from database import SessionLocal
import models
import json

db = SessionLocal()
funnel = db.query(models.Funnel).filter(models.Funnel.id == 15).first()
if funnel:
    print(json.dumps(funnel.steps, indent=2))
db.close()

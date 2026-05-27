import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@127.0.0.1:5435/zapvoice"
from database import SessionLocal
import models

db = SessionLocal()
funnel = db.query(models.Funnel).get(321)
if funnel:
    print(f"=== FUNNEL 321 ({funnel.name}) ===")
    print("Type of steps:", type(funnel.steps))
    import json
    print(json.dumps(funnel.steps, indent=2))
else:
    print("❌ Funil 321 não encontrado!")
db.close()

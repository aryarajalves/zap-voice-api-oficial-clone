import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "postgresql://postgres:5f90d6ef-f64a-44c7-9d68-b928d50ceb8f@127.0.0.1:5435/zapvoice"
from database import SessionLocal
import models

db = SessionLocal()
print("=== ALL FUNNELS ===")
funnels = db.query(models.Funnel).all()
for f in funnels:
    steps_len = len(f.steps) if isinstance(f.steps, list) else (len(f.steps.get("nodes", [])) if isinstance(f.steps, dict) else 0)
    print(f"ID: {f.id} | Name: {f.name} | Steps/Nodes Count: {steps_len}")
db.close()

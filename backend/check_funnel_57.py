
from database import SessionLocal
import models
import json

def check_funnel(fid):
    db = SessionLocal()
    try:
        f = db.query(models.Funnel).filter(models.Funnel.id == fid).first()
        if f:
             print(f"Funnel {fid} Name: {f.name}")
             print("Steps Graph:")
             print(json.dumps(f.steps, indent=2))
        else:
             print(f"Funnel {fid} not found")
    finally:
        db.close()

if __name__ == "__main__":
    check_funnel(57)

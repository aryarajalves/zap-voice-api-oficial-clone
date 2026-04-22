
from database import SessionLocal
import models
import json

def check_funnel(funnel_id):
    db = SessionLocal()
    try:
        f = db.query(models.Funnel).filter(models.Funnel.id == funnel_id).first()
        if not f:
            print(f"Funnel {funnel_id} not found")
            return
        
        print(f"Funnel ID: {f.id}")
        print(f"Name: {f.name}")
        print(f"Blocked Phones: {f.blocked_phones}")
        print(f"Allowed Phones: {f.allowed_phones}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_funnel(13)

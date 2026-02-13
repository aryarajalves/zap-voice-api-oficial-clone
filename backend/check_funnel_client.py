
from database import SessionLocal
import models

def check_funnel_client(fid):
    db = SessionLocal()
    try:
        f = db.query(models.Funnel).filter(models.Funnel.id == fid).first()
        if f:
             print(f"Funnel {fid} Client ID: {f.client_id}")
        else:
             print(f"Funnel {fid} not found")
    finally:
        db.close()

if __name__ == "__main__":
    check_funnel_client(57)

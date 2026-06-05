from database import SessionLocal
import models

db = SessionLocal()

print("--- Users ---")
users = db.query(models.User).all()
for u in users:
    print(f"ID: {u.id} | Email: {u.email} | Client ID: {u.client_id} | Role: {u.role}")

db.close()

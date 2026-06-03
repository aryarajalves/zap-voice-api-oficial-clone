import sys
import os
sys.path.append(os.path.abspath('backend'))
from database import SessionLocal
import models

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.email == 'aryarajmarketing@gmail.com').first()
    if user:
        print(f"USER: {user.email}, ROLE: {user.role}, CLIENT_ID: {user.client_id}")
    else:
        print("User not found")
finally:
    db.close()

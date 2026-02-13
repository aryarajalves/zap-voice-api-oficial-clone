from database import SessionLocal
from models import BlockedContact, User

db = SessionLocal()
try:
    print("--- Blocked Contacts in Database ---")
    blocks = db.query(BlockedContact).all()
    for b in blocks:
        print(f"Client: {b.client_id} | Phone: {b.phone} | Suffix: {b.phone[-8:] if b.phone else 'N/A'}")
    
    print("\n--- Current Users ---")
    users = db.query(User).all()
    for u in users:
        print(f"User Email: {u.email} | Client ID: {u.client_id}")
finally:
    db.close()

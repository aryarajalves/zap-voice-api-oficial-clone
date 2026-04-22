
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database URL - adjust if needed
DATABASE_URL = "postgresql://postgres:postgres@localhost:5435/zapvoice"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_memory_status():
    db = SessionLocal()
    try:
        sql = text("""
            SELECT id, phone_number, status, memory_webhook_status 
            FROM message_status 
            ORDER BY id DESC 
            LIMIT 10
        """)
        result = db.execute(sql)
        print("ID | Phone | Status | Memory Webhook Status")
        print("-" * 50)
        for row in result:
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_memory_status()

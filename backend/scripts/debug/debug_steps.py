import os
import sys

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from database import DATABASE_URL
import json

# Setup DB connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Fetching all funnels and checking Date Condition steps...")
funnels = db.query(models.Funnel).all()

for funnel in funnels:
    print(f"\nFunnel ID: {funnel.id} | Name: {funnel.name}")
    for idx, step in enumerate(funnel.steps):
        if step.get('type') == 'condition_date':
            print(f"  Step {idx+1} [condition_date]:")
            print(f"    - Condition: {step.get('condition')}")
            print(f"    - OnMatch: {step.get('onMatch')}")
            print(f"    - TriggerID Match: {step.get('triggerFunnelIdMatch')} (Type: {type(step.get('triggerFunnelIdMatch'))})")
            print(f"    - OnMismatch: {step.get('onMismatch')}")
            print(f"    - TriggerID Mismatch: {step.get('triggerFunnelId')} (Type: {type(step.get('triggerFunnelId'))})")
            
            # Check raw json subset for verification
            print(f"    - RAW Step Data: {json.dumps(step, default=str)}")

db.close()

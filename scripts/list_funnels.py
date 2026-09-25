import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import models
from core.database import SessionLocal

db = SessionLocal()
funnels = db.query(models.Funnel).all()
for f in funnels:
    print(f"ID: {f.id} | Nome: {f.name} | ClientID: {f.client_id} | Nós: {len(f.nodes or [])}")
db.close()

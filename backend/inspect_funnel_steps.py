from database import SessionLocal
import models
import json

db = SessionLocal()
funnel = db.query(models.Funnel).filter(models.Funnel.id == 15).first()
if funnel:
    print(f"Funnel ID: {funnel.id}")
    print(f"Steps Type: {type(funnel.steps)}")
    if isinstance(funnel.steps, dict):
        print(f"Nodes: {len(funnel.steps.get('nodes', []))}")
        print(f"Edges: {len(funnel.steps.get('edges', []))}")
    else:
        print(f"Steps Length: {len(funnel.steps)}")
else:
    print("Funnel 15 not found")
db.close()

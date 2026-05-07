from database import SessionLocal
import models
import json

db = SessionLocal()
funnel = db.query(models.Funnel).filter(models.Funnel.id == 15).first()
if funnel:
    print(f"Funnel ID: {funnel.id}")
    print(f"Name: {funnel.name}")
    print(f"Nodes: {len(funnel.nodes) if funnel.nodes else 'None'}")
    print(f"Edges: {len(funnel.edges) if funnel.edges else 'None'}")
    if funnel.nodes:
        print("First 2 nodes:")
        print(json.dumps(funnel.nodes[:2], indent=2))
else:
    print("Funnel 15 not found")
db.close()

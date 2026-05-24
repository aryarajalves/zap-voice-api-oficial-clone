from database import SessionLocal
from models import Client, ScheduledTrigger

db = SessionLocal()
clients = db.query(Client).all()
print(f"Total de clientes no banco: {len(clients)}")
for c in clients:
    triggers_count = db.query(ScheduledTrigger).filter(
        ScheduledTrigger.client_id == c.id,
        ScheduledTrigger.funnel_id.isnot(None)
    ).count()
    print(f"Client ID: {c.id} | Name: {c.name} | Triggers com Funil: {triggers_count}")
db.close()

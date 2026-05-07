import asyncio
from database import SessionLocal
from models import ScheduledTrigger
from services.triggers_service import reconcile_trigger_stats_logic

async def main():
    db = SessionLocal()
    triggers = db.query(ScheduledTrigger).all()
    await asyncio.gather(*[reconcile_trigger_stats_logic(t.id, t.client_id, db) for t in triggers])

if __name__ == "__main__":
    asyncio.run(main())

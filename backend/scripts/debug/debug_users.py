
import asyncio
from sqlalchemy import select
from models import User
from database import async_session

async def list_users():
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Total users found: {len(users)}")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Active: {u.is_active}")

if __name__ == "__main__":
    asyncio.run(list_users())

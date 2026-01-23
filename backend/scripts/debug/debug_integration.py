
import asyncio
import os
from baserow_client import BaserowClient
from chatwoot import ChatwootClient
from dotenv import load_dotenv

load_dotenv()

async def test_integration():
    try:
        # 1. Test Baserow Auth
        print("--- Testing Baserow ---")
        baserow = BaserowClient()
        table_id = os.getenv("BASEROW_TABLE_ID")
        if not table_id or not baserow.token:
            print("ERROR: Baserow Env Vars Missing!")
            return

        print(f"Checking table {table_id}...")
        # Try to fetch a dummy number to see if it allows connection
        res = await baserow.get_row_by_phone(table_id, "000000000")
        if res is None:
             print("Baserow Connection OK (Or row not found, but no Auth Error)")
        
        # 2. Test Chatwoot Inboxes (Why did it fail?)
        print("\n--- Testing Chatwoot Inboxes ---")
        chatwoot = ChatwootClient()
        inboxes = await chatwoot.get_inboxes()
        print(f"Inboxes Found: {len(inboxes)}")
        for i in inboxes:
            print(f"- {i['name']} (ID: {i['id']})")
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_integration())

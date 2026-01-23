
import asyncio
import os
from chatwoot import ChatwootClient
from dotenv import load_dotenv

load_dotenv()

async def list_inboxes():
    client = ChatwootClient()
    try:
        inboxes = await client.get_inboxes()
        print("--- Inboxes Found ---")
        for i in inboxes:
            print(f"ID: {i.get('id')} | Name: {i.get('name')} | Type: {i.get('channel_type')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_inboxes())

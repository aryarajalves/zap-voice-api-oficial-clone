import os
import sys
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from chatwoot_client import ChatwootClient

async def run():
    client = ChatwootClient(client_id=1)
    templates = await client.get_whatsapp_templates()
    print("--- Templates from Meta ---")
    for t in templates:
        print(f"ID: {t.get('id')} (type={type(t.get('id'))}) | Name: {t.get('name')} | Status: {t.get('status')}")

asyncio.run(run())

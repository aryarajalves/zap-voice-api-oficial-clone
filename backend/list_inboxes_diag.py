import asyncio
import os
import sys

# Adiciona o diretório atual ao path para importar corretamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from database import SessionLocal
import models
from chatwoot_client import ChatwootClient
import json

async def list_inboxes():
    db = SessionLocal()
    try:
        # Get settings for client 1
        client_id = 1
        chatwoot = ChatwootClient(client_id=client_id)
        
        print(f"--- Settings for Client {client_id} ---")
        print(f"URL: {chatwoot.api_url}")
        print(f"Account ID: {chatwoot.account_id}")
        print(f"Token: {chatwoot.api_token[:10]}...")
        print(f"Selected Inbox ID: {chatwoot.settings.get('CHATWOOT_SELECTED_INBOX_ID')}")
        
        print("\n--- Requesting Inboxes from Chatwoot ---")
        # Manually fetch to see everything
        import httpx
        async with httpx.AsyncClient() as client:
            url = f"{chatwoot.base_url}/inboxes"
            resp = await client.get(url, headers=chatwoot.headers)
            if resp.status_code == 200:
                data = resp.json()
                inboxes = data.get("payload", [])
                print(f"Found {len(inboxes)} inboxes.")
                for ib in inboxes:
                    print(f"ID: {ib.get('id')} | Name: {ib.get('name')} | Type: {ib.get('channel_type')}")
            else:
                print(f"Error fetching inboxes: {resp.status_code} - {resp.text}")
                
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(list_inboxes())

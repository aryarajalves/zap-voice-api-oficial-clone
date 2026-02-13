import asyncio
import sys
import os
import httpx
from datetime import datetime, timezone

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from chatwoot_client import ChatwootClient

async def main():
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    phone = "558596123586"
    client = ChatwootClient(client_id=1)
    search_res = await client.search_contact(phone)
    
    contact = search_res["payload"][0]
    conv_res = await client.get_contact_conversations(contact["id"])
    conv_id = conv_res["payload"][0]["id"]
    
    url = f"{client.base_url}/conversations/{conv_id}/messages"
    async with httpx.AsyncClient() as session:
        res = await session.get(url, headers=client.headers)
        messages = res.json().get("payload", [])
        if messages:
            msg = messages[0]
            created_at = msg.get("created_at")
            print(f"DEBUG: created_at value: {created_at}")
            print(f"DEBUG: created_at type: {type(created_at)}")
            
if __name__ == "__main__":
    asyncio.run(main())

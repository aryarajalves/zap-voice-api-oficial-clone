import asyncio
import sys
import os
import httpx

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from chatwoot_client import ChatwootClient

async def main():
    phone = "558596123586"
    client = ChatwootClient(client_id=1)
    search_res = await client.search_contact(phone)
    contact = search_res["payload"][0]
    conv_res = await client.get_contact_conversations(contact["id"])
    if conv_res["payload"]:
        conv = conv_res["payload"][0]
        la = conv.get("last_activity_at")
        print(f"DEBUG: last_activity_at value: {la}")
        print(f"DEBUG: last_activity_at type: {type(la)}")

if __name__ == "__main__":
    asyncio.run(main())

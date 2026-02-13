import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from chatwoot_client import ChatwootClient
# from database import SessionLocal

async def main():
    phone = "558596123586"
    print(f"----- DEBUGGING 24H WINDOW FOR {phone} -----")
    
    # Init Chatwoot Client with client_id=1
    client = ChatwootClient(client_id=1)
    
    print("1. Searching Contact...")
    search_res = await client.search_contact(phone)
    
    if not search_res or not search_res.get("payload"):
        print("❌ Contact not found.")
        return

    contact = search_res["payload"][0]
    contact_id = contact.get("id")
    print(f"✅ Contact Found! ID: {contact_id}, Name: {contact.get('name')}")
    
    print("2. Fetching Conversations...")
    conv_res = await client.get_contact_conversations(contact_id)
    
    if not conv_res or not conv_res.get("payload"):
        print("❌ No conversations found.")
        return
        
    conversations = conv_res["payload"]
    print(f"✅ Found {len(conversations)} conversations.")
    
    # Sort by ID or last_activity to get the latest
    conversations.sort(key=lambda x: x.get("last_activity_at", 0), reverse=True)
    
    latest = conversations[0]
    conv_id = latest.get("id")
    print(f"ℹ️ Checking Latest Conversation ID: {conv_id}")
    print(f"ℹ️ Last Activity (API): {latest.get('last_activity_at')}")
    
    print("3. Running is_within_24h_window check...")
    is_open = await client.is_within_24h_window(conv_id)
    
    print(f"\n👉 FINAL RESULT: Window is {'OPEN' if is_open else 'CLOSED'}")

if __name__ == "__main__":
    asyncio.run(main())

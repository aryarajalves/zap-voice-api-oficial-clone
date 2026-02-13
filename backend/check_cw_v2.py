import httpx
import asyncio
import os
import json

API_URL = "https://chatsarah.jords.site/api/v1"
API_TOKEN = "FD23sbex4HzXdKh9yEiksuDR"
ACCOUNT_ID = "1"
INBOX_ID = 1
CONTACT_ID = 2370 

async def diagnose():
    headers = {
        "api_access_token": API_TOKEN,
        "Content-Type": "application/json"
    }
    
    print(f"--- Diagnóstico Chatwoot Avançado ---")
    async with httpx.AsyncClient(verify=False) as client:
        
        # Test 1: List Inboxes to see type
        resp = await client.get(f"{API_URL}/accounts/{ACCOUNT_ID}/inboxes", headers=headers)
        if resp.status_code == 200:
            for i in resp.json().get("payload", []):
                print(f"Inbox {i['id']}: {i['name']} ({i['channel_type']})")

        base_url = f"{API_URL}/accounts/{ACCOUNT_ID}/conversations"
        
        tests = [
            ("Std", {"source_id": CONTACT_ID, "inbox_id": INBOX_ID}),
            ("ContactKey", {"contact_id": CONTACT_ID, "inbox_id": INBOX_ID}),
            ("WithMsg", {"source_id": CONTACT_ID, "inbox_id": INBOX_ID, "message": {"content": "Test"}}),
            ("Slash", {"source_id": CONTACT_ID, "inbox_id": INBOX_ID}, True), # True for slash
        ]

        for name, payload, *opts in tests:
            use_slash = opts[0] if opts else False
            url = base_url + "/" if use_slash else base_url
            
            print(f"\nTesting {name} -> {url}")
            try:
                resp = await client.post(url, json=payload, headers=headers)
                print(f"Status: {resp.status_code}")
                if resp.status_code != 200:
                    print(f"Resp: {resp.text}")
                else:
                    print(f"SUCCESS: {resp.json().get('id')}")
                    break # Stop if works
            except Exception as e:
                print(f"Exc: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose())

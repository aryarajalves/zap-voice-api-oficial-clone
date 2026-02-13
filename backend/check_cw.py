import httpx
import asyncio
import os
import json

# Credenciais recuperadas dos logs/banco
API_URL = "https://chatsarah.jords.site/api/v1"
API_TOKEN = "FD23sbex4HzXdKh9yEiksuDR"
ACCOUNT_ID = "1"
INBOX_ID = 1
CONTACT_ID = 2370 # ID encontrado nos logs

async def diagnose():
    headers = {
        "api_access_token": API_TOKEN,
        "Content-Type": "application/json"
    }
    
    print(f"--- Diagnóstico Chatwoot ---")
    print(f"URL: {API_URL}")
    print(f"Account: {ACCOUNT_ID}")
    
    async with httpx.AsyncClient(verify=False) as client:
        # 1. Check Account
        try:
            resp = await client.get(f"{API_URL}/profile", headers=headers)
            print(f"Profile Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"User: {resp.json().get('name')}")
            else:
                print(f"Error Profile: {resp.text}")
        except Exception as e:
            print(f"Exceção Profile: {e}")

        # 2. List Inboxes
        try:
            resp = await client.get(f"{API_URL}/accounts/{ACCOUNT_ID}/inboxes", headers=headers)
            print(f"Inboxes Status: {resp.status_code}")
            if resp.status_code == 200:
                inboxes = resp.json().get("payload", [])
                print(f"Found {len(inboxes)} inboxes.")
                for i in inboxes:
                    print(f" - ID: {i['id']} | Name: {i['name']} | Type: {i['channel_type']}")
            else:
                print(f"Error Inboxes: {resp.text}")
        except Exception as e:
            print(f"Exceção Inboxes: {e}")

        # 3a. Check Contact Conversations
        try:
            resp = await client.get(f"{API_URL}/accounts/{ACCOUNT_ID}/contacts/{CONTACT_ID}/conversations", headers=headers)
            print(f"Contact Convs Status: {resp.status_code}")
            print(f"Body: {resp.text}")
        except Exception as e:
            print(f"Error Contact Convs: {e}")

        # 3b. Try Create Conversation (Dry Run / Test) WITH MESSAGE
        print(f"--- Testing Create Conversation ---")
        payload = {
            "source_id": CONTACT_ID,
            "inbox_id": INBOX_ID,
            "status": "open"
        }
        url = f"{API_URL}/accounts/{ACCOUNT_ID}/conversations"
        print(f"Target URL: {url}")
        
        try:
            resp = await client.post(url, json=payload, headers=headers)
            print(f"Create Conv Status: {resp.status_code}")
            print(f"Response: {resp.text}")
        except Exception as e:
             print(f"Exceção Create Conv: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose())

import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv() # Load .env from root

from chatwoot_client import ChatwootClient
from config_loader import get_settings

async def main():
    print("--- Debugging Template Fetching ---")
    
    # Check Settings
    settings = get_settings()
    wa_id = settings.get("WA_BUSINESS_ACCOUNT_ID")
    wa_token = settings.get("WA_ACCESS_TOKEN")
    
    import httpx
    
    print(f"WA_BUSINESS_ACCOUNT_ID: {wa_id}")
    
    if not wa_id or not wa_token:
        print("❌ Credentials missing.")
        return

    url = f"https://graph.facebook.com/v24.0/{wa_id}/message_templates?limit=250"
    headers = {
        "Authorization": f"Bearer {wa_token}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"--- REQUEST ---")
            print(f"URL: {url}")
            print(f"--- RESPONSE ---")
            response = await client.get(url, headers=headers)
            print(f"Status: {response.status_code}")
            try:
                import json
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

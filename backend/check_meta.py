
import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def check():
    account_id = os.getenv('WA_BUSINESS_ACCOUNT_ID')
    token = os.getenv('WA_ACCESS_TOKEN')
    
    if not account_id or not token:
        print("Credenciais ausentes no .env")
        return

    url = f"https://graph.facebook.com/v24.0/{account_id}/message_templates?limit=5"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Checking Templates for Account: {account_id}")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            print(f"Meta API Status: {resp.status_code}")
            if resp.status_code != 200:
                print(f"Error Body: {resp.text}")
            else:
                data = resp.json()
                print(f"Success! Found {len(data.get('data', []))} templates.")
                print("Exemplo:", data.get('data', [])[0] if data.get('data') else "None")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(check())

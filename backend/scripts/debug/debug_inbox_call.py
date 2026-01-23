
import httpx
import asyncio

async def test_inboxes():
    try:
        print("Requesting GET http://localhost:8000/chatwoot/inboxes ...")
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:8000/chatwoot/inboxes", timeout=10.0)
            print(f"Status: {resp.status_code}")
            print(f"Body: {resp.text}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_inboxes())

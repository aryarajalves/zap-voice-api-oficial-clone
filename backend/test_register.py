import httpx
import asyncio

async def test_register():
    payload = {
        "template_name": "test",
        "total_sent": 1,
        "total_failed": 0,
        "contacts_list": ["5585999999999"],
        "language": "pt_BR",
        "cost_per_unit": 0.06,
        "message_ids": [
            {
                "phone": "5585999999999",
                "message_id": "wamid.TEST123"
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/bulk-send/register",
                json=payload,
                timeout=10.0
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test_register())

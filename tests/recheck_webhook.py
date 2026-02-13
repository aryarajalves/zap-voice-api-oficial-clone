
import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def check_debug():
    url = f"{BASE_URL}/api/webhooks/ping" # Dummy just to get DB loaded or use a real check script
    print("Checking for latest webhook payload...")
    
    # We'll use the python -c logic to read DB directly as it's more reliable than a specialized endpoint right now
    pass

if __name__ == "__main__":
    # Simulate a real click
    print("📡 Simulating a real button click payload...")
    payload = {
        "event": "message_created",
        "message_type": "incoming",
        "content": "Pode falar sim!",
        "sender": {
            "phone_number": "+558596123586"
        },
        "conversation": {
            "id": 9999
        }
    }
    
    try:
        r = requests.post(f"{BASE_URL}/webhooks/chatwoot", json=payload)
        print(f"Post Response: {r.status_code}")
        print(f"Post Body: {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

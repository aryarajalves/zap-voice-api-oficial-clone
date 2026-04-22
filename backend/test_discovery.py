import requests
import json

BASE_URL = "http://localhost:8000/api"
INTEGRATION_ID = "6fb4a36f-e3c7-432d-905e-5f400778c772" # I'll need to check if this exists or use a real one from the log

def test_discover_products():
    url = f"{BASE_URL}/webhook-integrations/{INTEGRATION_ID}/discover-products"
    # We need auth if it's protected, but my routes usually have dependencies.
    # I'll check webhooks_integrations.py to see if it needs auth.
    
    # Actually, I'll just check if the endpoint is there.
    try:
        resp = requests.post(url)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_discover_products()

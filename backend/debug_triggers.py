import requests

try:
    print("GET /triggers...")
    res = requests.get("http://localhost:8000/triggers")
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")

import urllib.request
import json

req = urllib.request.Request('http://localhost:8000/api/webhook-integrations', headers={'client-id': '1'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")

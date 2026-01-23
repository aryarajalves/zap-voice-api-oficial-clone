import requests
import json

payload = {
  "name": "Funil Teste",
  "description": "Esse é o funil 01",
  "steps": [
    {"type": "message", "content": "Essa mensagem é a primeira.", "delay": 0, "id": 167890},
    {"type": "delay", "delay": 10, "content": "", "id": 167891},
    {"type": "message", "content": "Essa mensagem é a segunda.", "delay": 0, "id": 167892}
  ]
}

try:
    print("Sending POST /funnels...")
    res = requests.post("http://localhost:8000/funnels", json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")

import requests
import json

# Testando o novo endpoint com client_id=6
url = "http://localhost:8000/api/webhooks/chatwoot_events?client_id=6"
payload = {
    "event": "message_created",
    "message_type": "incoming",
    "account": {"id": 1},
    "inbox": {"id": 5},
    "conversation": {
        "id": 8888,
        "contact_inbox": {
            "source_id": "558596123586"
        }
    },
    "sender": {
        "phone_number": "558596123586",
        "name": "Simulacao Final"
    }
}

try:
    print(f"Enviando POST para {url}...")
    response = requests.post(url, json=payload, timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro ao enviar: {e}")

import requests
import json

# Integration ID created for testing
integration_uuid = "e0333e7c-7715-43c2-820a-9b4641ddaa87"
url = f"http://localhost:8000/api/webhooks/external/{integration_uuid}"

# Simulando exato payload do Elementor/Supabase enviado pelo usuário
payload = [
  {
    "headers": {
      "host": "webhookandrieli.jords.site",
      "user-agent": "Deno/2.1.4 (variant; SupabaseEdgeRuntime/1.73.0)",
      "content-length": "890",
      "accept": "*/*",
      "accept-encoding": "gzip,br",
      "accept-language": "*",
      "content-type": "application/json"
    },
    "body": {
      "cliente": {
        "nome_completo": "Andrieli Márcia de oliveira",
        "email": "driiholiveira71@gmail.com",
        "telefone": "37991165753"
      },
      "areas_foco": [
        "amor",
        "familia"
      ],
      "nascimento": {
        "data": "1996-02-08",
        "horario": "14:41:00",
        "cidade": "Nova serrana",
        "estado": "Mg",
        "pais": "Brasil"
      }
    },
    "webhookUrl": "https://webhookandrieli.jords.site/webhook/mapa-astral",
    "executionMode": "production"
  }
]

headers = {
    "Content-Type": "application/json"
}

try:
    print(f"🚀 Enviando Simulação com Payload Real para {url}...")
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    print(f"✅ Status Code: {response.status_code}")
    print(f"📄 Resposta: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"❌ Erro na simulação: {e}")

import requests
import json
import time
import sys
import os

# Adiciona o diretório pai ao path para importar as configurações se necessário
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configurações
BASE_URL = "http://localhost:8000/api"
# Tenta também a URL externa se estiver no ambiente certo
EXTERNAL_URL = os.getenv("WEBHOOK_BASE_URL", "https://api.aryaraj.shop") + "/api"

def simulate_meta_status(msg_id, status="read", recipient="5511999999999"):
    """Simula um payload da Meta de status (delivered/read)"""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "DISPLAY_PHONE_NUMBER",
                                "phone_number_id": "PHONE_NUMBER_ID"
                            },
                            "statuses": [
                                {
                                    "id": msg_id,
                                    "status": status,
                                    "timestamp": str(int(time.time())),
                                    "recipient_id": recipient,
                                    "conversation": {
                                        "id": "CONVERSATION_ID",
                                        "origin": {"type": "marketing"}
                                    },
                                    "pricing": {
                                        "billable": True,
                                        "pricing_model": "CBP",
                                        "category": "marketing"
                                    }
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    print(f"\n🚀 [TESTE] Simulando status '{status}' para a mensagem {msg_id}...")
    
    # Testa localmente primeiro
    try:
        print(f"📡 Enviando para LOCAL: {BASE_URL}/meta")
        resp = requests.post(f"{BASE_URL}/meta", json=payload, timeout=5)
        print(f"✅ Resposta LOCAL: {resp.status_code}")
        print(f"📄 Corpo: {resp.text}")
    except Exception as e:
        print(f"❌ Erro ao conectar no LOCAL: {e}")

    # Se a rota falhar com 405, vamos tentar entender o porquê
    return resp.status_code if 'resp' in locals() else None

if __name__ == "__main__":
    # Se você tiver um ID de mensagem real da Meta (wamid...), coloque aqui
    # Caso contrário, o script tentará buscar o último no banco se rodado dentro do container
    test_id = "wamid.HBgNNTUxMTk5OTE4NjU0NhUCABEYEkQ0M0RCNTE0ODVDNjhEMEY5OAA="
    if len(sys.argv) > 1:
        test_id = sys.argv[1]
    
    simulate_meta_status(test_id, "delivered")
    time.sleep(1)
    simulate_meta_status(test_id, "read")

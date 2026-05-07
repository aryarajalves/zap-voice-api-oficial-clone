import os
import requests
import uuid
import time
from dotenv import load_dotenv

# Carrega configurações
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    return response.json().get("access_token")

def test_smart_interruption():
    print("\n--- [TEST] Interrupção Inteligente ---")
    token = get_token()
    if not token:
        print("❌ Falha ao obter token")
        return False

    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    res = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = res.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    integration_id = None
    try:
        # 2. Criar Integração de Teste
        integration_data = {
            "name": "Teste Interrupção Automatizado",
            "platform": "hotmart",
            "status": "active",
            "mappings": [
                {
                    "event_type": "compra_aprovada",
                    "template_name": "hello_world",
                    "delay_minutes": 5, # Delay para ficar pendente
                    "is_active": True
                },
                {
                    "event_type": "reembolso",
                    "cancel_pending_on_trigger": True,
                    "cancel_event_types": ["compra_aprovada"],
                    "is_active": True
                }
            ]
        }
        res = requests.post(f"{BASE_URL}/webhook-integrations", headers=headers, json=integration_data)
        if res.status_code not in [200, 201]:
            print(f"Erro ao criar integração: {res.text}")
            return False
        
        integration = res.json()
        integration_id = integration['id']
        print(f"Integracao criada: {integration_id}")

        test_phone = "5511977777777"

        # 3. Simular Webhook de Compra Aprovada
        print("Simulando Compra Aprovada...")
        payload_compra = {
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {"name": "Test User", "phone": test_phone, "email": "test@example.com"},
                "product": {"name": "Produto Teste"},
                "purchase": {"status": "APPROVED", "payment": {"type": "CREDIT_CARD"}}
            }
        }
        res = requests.post(f"{BASE_URL}/webhooks/{integration_id}", json=payload_compra)
        if res.status_code != 200:
            print(f"Erro no webhook de compra: {res.text}")
            return False
        
        # Aguarda processamento em background
        time.sleep(2)

        # 4. Verificar se o trigger foi criado com status 'queued'
        res = requests.get(f"{BASE_URL}/triggers?exclude_webhooks=false&phone={test_phone}", headers=headers)
        triggers = res.json().get("items", [])
        pending_trigger = next((t for t in triggers if t['contact_phone'] == test_phone and t['status'] in ['pending', 'queued'] and t['event_type'] == 'compra_aprovada'), None)
        
        if not pending_trigger:
            print("Trigger pendente não encontrado!")
            return False
        
        print(f"Trigger pendente encontrado (ID: {pending_trigger['id']})")

        # 5. Simular Webhook de Reembolso (Deve cancelar o anterior)
        print("Simulando Reembolso (Interrupcao)...")
        payload_reembolso = {
            "event": "PURCHASE_REFUNDED",
            "data": {
                "buyer": {"name": "Test User", "phone": test_phone, "email": "test@example.com"},
                "product": {"name": "Produto Teste"},
                "purchase": {"status": "REFUNDED"}
            }
        }
        res = requests.post(f"{BASE_URL}/webhooks/{integration_id}", json=payload_reembolso)
        if res.status_code != 200:
            print(f"Erro no webhook de reembolso: {res.text}")
            return False

        # Aguarda processamento em background
        time.sleep(2)

        # 6. Verificar se o trigger anterior foi cancelado
        res = requests.get(f"{BASE_URL}/triggers?exclude_webhooks=false&phone={test_phone}", headers=headers)
        triggers = res.json().get("items", [])
        cancelled_trigger = next((t for t in triggers if t['id'] == pending_trigger['id']), None)
        
        if not cancelled_trigger or cancelled_trigger['status'] != 'cancelled':
            print(f"Trigger não foi cancelado! Status atual: {cancelled_trigger['status'] if cancelled_trigger else 'N/A'}")
            return False
        
        print("OK: Trigger cancelado com sucesso pela interrupção inteligente!")
        return True

    except Exception as e:
        print(f"ERRO no teste: {e}")
        return False
    finally:
        # Limpeza
        if integration_id:
             requests.delete(f"{BASE_URL}/webhook-integrations/{integration_id}", headers=headers)
             print("Limpeza: Integração de teste removida.")

if __name__ == "__main__":
    success = test_smart_interruption()
    if success:
        print("\nTESTE DE INTERRUPÇÃO INTELIGENTE APROVADO!")
    else:
        print("\nTESTE DE INTERRUPÇÃO INTELIGENTE FALHOU!")
        exit(1)

import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    return response.json().get("access_token")

def test_blocked_contacts(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = response.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    phone = "5511988888888"
    
    # 2. Bloquear contato
    try:
        # Nota: blocked.py tem prefix="/blocked" e @router.post("/"). Total: /api/blocked/
        response = requests.post(f"{BASE_URL}/blocked/", headers=headers, json={"phone": phone, "reason": "Teste Automatizado"})
        if response.status_code in [200, 201]:
            contact_id = response.json().get("id")
            print(f"✅ Bloqueio - Contato {phone} bloqueado (ID: {contact_id})")
            
            # 3. Listar bloqueados
            response = requests.get(f"{BASE_URL}/blocked/", headers=headers)
            if response.status_code == 200:
                print("✅ Bloqueio - Listagem OK")
                
                # 4. Desbloquear por ID
                response = requests.delete(f"{BASE_URL}/blocked/{contact_id}", headers=headers)
                if response.status_code in [200, 204]:
                    print("✅ Bloqueio - Desbloqueio OK")
                    return True, "✅ Fluxo de bloqueio validado"
                else:
                    print(f"❌ Bloqueio - Erro no desbloqueio: {response.status_code}")
            return False, f"❌ Bloqueio - Erro na listagem: {response.status_code}"
        return False, f"❌ Bloqueio - Erro no bloqueio: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Bloqueio - Erro de conexão: {e}"

def test_webhook_simulation():
    # Teste de webhook não requer token
    # O endpoint real em webhooks.py é @router.post("/webhooks/meta")
    url = f"{BASE_URL}/webhooks/meta"
    
    webhook_data = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "123456",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "12345", "phone_number_id": "12345"},
                    "messages": [{
                        "from": "5511999999999",
                        "id": "wamid.ID",
                        "timestamp": "123456789",
                        "text": {"body": "oi"},
                        "type": "text"
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    
    try:
        response = requests.post(url, json=webhook_data)
        if response.status_code in [200, 202]: # 202 because it might return "queued"
            return True, "✅ Webhook - Simulação de recebimento OK"
        return False, f"❌ Webhook - Erro na simulação: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Webhook - Erro de conexão: {e}"

def run_integration_tests():
    print("\n--- [06] Testes de Webhooks e Bloqueios ---")
    token = get_token()
    if not token:
        import sys
        sys.exit(1)

    results = [
        test_blocked_contacts(token),
        test_webhook_simulation()
    ]
    
    all_success = True
    for success, msg in results:
        print(msg)
        if not success: all_success = False
    
    if not all_success:
        import sys
        sys.exit(1)

if __name__ == "__main__":
    run_integration_tests()

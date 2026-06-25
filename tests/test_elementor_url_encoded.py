import os
import requests
import uuid
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

def test_elementor_url_encoded(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = response.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    print("\n[STEP 1] Criando integração Elementor para teste...")
    integration_data = {
        "name": f"Test Elementor {uuid.uuid4().hex[:4]}",
        "platform": "elementor",
        "status": "active",
        "mappings": [
            {
                "event_type": "form_submission",
                "template_id": None,
                "funnel_id": None,
                "delay_minutes": 0,
                "is_active": True,
                "private_note": "true",
                "publish_external_event": True
            }
        ]
    }
    resp = requests.post(f"{BASE_URL}/webhook-integrations", headers=headers, json=integration_data)
    if resp.status_code not in [200, 201]:
        return False, f"Falha ao criar integração: {resp.text}"
    
    integration = resp.json()
    int_id = integration['id']
    webhook_url = f"{BASE_URL}/webhooks/{int_id}"
    
    print(f"[STEP 2] Enviando webhook simulando Elementor (urlencoded)...")
    # Elementor envia como application/x-www-form-urlencoded
    payload_form = {
        "form_id": "elementor_form_test",
        "form_name": "Formulário de Contato",
        "fields[name][value]": "Cliente Teste Elementor",
        "fields[email][value]": "cliente_elementor@teste.com",
        "fields[phone][value]": "5511977777777"
    }
    
    # Faz o POST como form (data=) em vez de json (json=)
    resp = requests.post(webhook_url, data=payload_form)
    print(f"Status Code do Webhook: {resp.status_code}")
    print(f"Resposta do Webhook: {resp.text}")
    
    if resp.status_code != 200:
        # Deletar integração antes de falhar
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"Webhook falhou com status {resp.status_code}: {resp.text}"
    
    res_json = resp.json()
    if res_json.get("status") != "success":
        # Deletar integração antes de falhar
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"Resposta não indica sucesso: {res_json}"
        
    print("[STEP 3] Validando dados decodificados no histórico do webhook...")
    history_id = res_json.get("history_id")
    resp_history = requests.get(f"{BASE_URL}/webhook-integrations/{int_id}/history", headers=headers)
    if resp_history.status_code != 200:
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"Erro ao buscar histórico: {resp_history.text}"
        
    history_list = resp_history.json()
    # Achar o registro de histórico correto
    matched_history = next((h for h in history_list if h.get("id") == history_id), None)
    if not matched_history:
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"Histórico #{history_id} não encontrado."
        
    processed_data = matched_history.get("processed_data") or {}
    print(f"Dados processados no histórico: {processed_data}")
    
    # Validar se os dados do lead foram mapeados corretamente a partir das chaves do formulário
    name = processed_data.get("name")
    email = processed_data.get("email")
    phone = processed_data.get("phone")
    
    if name != "Cliente Teste Elementor":
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"Nome incorreto: {name}"
        
    if email != "cliente_elementor@teste.com":
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"E-mail incorreto: {email}"
        
    if phone != "5511977777777":
        requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
        return False, f"Telefone incorreto: {phone}"

    print("[STEP 4] Deletando integração de teste...")
    requests.delete(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers)
    
    return True, "[OK] Webhook Elementor (urlencoded) processado e validado com sucesso!"

def run_integration_tests():
    print("\n--- Teste de Webhook Elementor (urlencoded) ---")
    token = get_token()
    if not token:
        print("❌ Erro ao obter token do administrador.")
        return
        
    success, msg = test_elementor_url_encoded(token)
    print(msg)
    if not success:
        exit(1)

if __name__ == "__main__":
    run_integration_tests()

import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    # O backend espera form-data ou urlencoded
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    return response.json().get("access_token")

def test_individual_trigger(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter primeiro client_id disponível
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    if response.status_code != 200:
        return False, f"❌ Triggers - Erro ao buscar clientes: {response.status_code}"
    
    clients = response.json()
    if not isinstance(clients, list) or not clients:
        return False, "❌ Triggers - Nenhum cliente encontrado"
    
    client_id = clients[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    # 2. Obter primeiro funil disponível
    response = requests.get(f"{BASE_URL}/funnels", headers=headers)
    if response.status_code != 200:
        return False, f"❌ Triggers - Erro ao buscar funis: {response.status_code}"
    
    funnels = response.json()
    if not isinstance(funnels, list) or not funnels:
        return False, "❌ Triggers - Nenhum funil encontrado para este cliente"
    
    funnel_id = funnels[0]['id']
    
    # 3. Agendar disparo individual
    trigger_data = {
        "contact_phone": "5511999999999",
        "contact_name": "Teste Agendamento",
        "conversation_id": "12345" # Simulado
    }
    
    try:
        # Endpoint: POST /api/funnels/{id}/trigger
        response = requests.post(f"{BASE_URL}/funnels/{funnel_id}/trigger", headers=headers, json=trigger_data)
        if response.status_code == 201 or response.status_code == 200:
            trigger_id = response.json().get("id")
            print(f"✅ Agendamento - Criado OK (ID: {trigger_id})")
            return True, "✅ Agendamento individual simulado com sucesso"
        return False, f"❌ Agendamento - Erro: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Agendamento - Erro de conexão: {e}"

def test_bulk_trigger(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter primeiro client_id disponível
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    if response.status_code != 200:
        return False, f"❌ Bulk - Erro ao buscar clientes: {response.status_code}"
    
    clients = response.json()
    if not isinstance(clients, list) or not clients:
        return False, "❌ Bulk - Nenhum cliente encontrado"
        
    client_id = clients[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    # 2. Obter primeiro funil disponível
    funnels_res = requests.get(f"{BASE_URL}/funnels", headers=headers)
    if funnels_res.status_code != 200 or not funnels_res.json():
         return False, "❌ Bulk - Nenhum funil encontrado para teste de bulk"
    funnel_id = funnels_res.json()[0]['id']
    
    # 3. Simulação de disparo em massa (JSON)
    # Endpoint: POST /api/funnels/{id}/trigger-bulk
    bulk_data = {
        "conversations": [
            {"id": "conv1", "meta": {"sender": {"name": "Teste 1", "phone_number": "5511911111111"}}},
            {"id": "conv2", "meta": {"sender": {"name": "Teste 2", "phone_number": "5511922222222"}}}
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/funnels/{funnel_id}/trigger-bulk", headers=headers, json=bulk_data)
        if response.status_code in [200, 201, 202]:
            print("✅ Disparo em Massa - Requisição aceita")
            return True, "✅ Disparo em massa simulado com sucesso"
        return False, f"❌ Disparo em Massa - Erro: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Disparo em Massa - Erro de conexão: {e}"

def run_trigger_tests():
    print("\n--- [05] Testes de Agendamentos e Disparos ---")
    token = get_token()
    if not token:
        print("❌ Token não obtido")
        import sys
        sys.exit(1)

    results = [
        test_individual_trigger(token),
        test_bulk_trigger(token)
    ]
    
    all_success = True
    for success, msg in results:
        print(msg)
        if not success:
            all_success = False
            
    if not all_success:
        import sys
        sys.exit(1)

if __name__ == "__main__":
    run_trigger_tests()

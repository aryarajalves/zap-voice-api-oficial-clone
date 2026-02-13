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

def test_funnels_crud(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter primeiro client_id disponível
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    if response.status_code != 200:
        return False, f"❌ Funis - Erro ao buscar clientes: {response.status_code}"
    
    clients = response.json()
    if not isinstance(clients, list) or not clients:
        return False, "❌ Funis - Nenhum cliente encontrado para vincular funil"
    
    client_id = clients[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    # 2. Criar funil
    funnel_data = {
        "name": "Funil de Teste Automatizado",
        "description": "Criado via script de teste",
        "client_id": client_id,
        "steps": [
            {"type": "message", "content": "Olá, este é um teste automatizado!", "delay": 2}
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/funnels", headers=headers, json=funnel_data)
        if response.status_code == 201 or response.status_code == 200:
            funnel_id = response.json().get("id")
            print(f"✅ Funis - Criação OK (ID: {funnel_id})")
            
            # 3. Listar funis
            response = requests.get(f"{BASE_URL}/funnels", headers=headers, params={"client_id": client_id})
            if response.status_code == 200:
                print("✅ Funis - Listagem OK")
                
                # 4. Deletar funil
                del_res = requests.delete(f"{BASE_URL}/funnels/{funnel_id}", headers=headers)
                if del_res.status_code == 200:
                    print("✅ Funis - Exclusão OK")
                else:
                    print(f"❌ Funis - Erro na exclusão: {del_res.status_code}")
                
                return True, "✅ Funis - Ciclo CRUD completo finalizado"
            return False, f"❌ Funis - Erro na listagem: {response.status_code}"
        return False, f"❌ Funis - Erro na criação: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Funis - Erro de conexão: {e}"

def run_funnel_tests():
    print("\n--- [04] Testes de Funis ---")
    token = get_token()
    if not token:
        print("❌ Token não obtido")
        import sys
        sys.exit(1)

    results = [
        test_funnels_crud(token)
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
    run_funnel_tests()

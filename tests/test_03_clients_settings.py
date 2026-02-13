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

def test_clients_crud(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Listar clientes
    try:
        response = requests.get(f"{BASE_URL}/clients/", headers=headers)
        if response.status_code == 200:
            print("✅ Clientes - Listagem OK")
            clients = response.json()
            # 2. Criar cliente de teste
            test_client_name = "Cliente de Teste Automatizado"
            # Verificar se já existe
            exists = any(c['name'] == test_client_name for c in clients)
            if not exists:
                response = requests.post(f"{BASE_URL}/clients/", headers=headers, json={"name": test_client_name})
                if response.status_code == 201 or response.status_code == 200:
                    print("✅ Clientes - Criação OK")
                else:
                    print(f"❌ Clientes - Erro na criação: {response.status_code}")
                    return False, f"❌ Clientes - Erro na criação: {response.status_code}"
            else:
                print("ℹ️ Clientes - Cliente de teste já existe")
            return True, "✅ Clientes - Operações CRUD básicas simuladas"
        return False, f"❌ Clientes - Erro: {response.status_code} em {response.url}"
    except Exception as e:
        return False, f"❌ Clientes - Erro de conexão: {e}"

def run_feature_tests():
    print("\n--- [03] Testes de Clientes e Configurações ---")
    token = get_token()
    if not token:
        print("❌ Não foi possível obter token")
        import sys
        sys.exit(1)

    results = [
        test_clients_crud(token)
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
    run_feature_tests()

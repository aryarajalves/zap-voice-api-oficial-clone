import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    # Note: backend expects form-data for OAuth2PasswordRequestForm
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    return response.json().get("access_token")

def test_chatwoot_agents_management(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Prerequisite: Have at least one client
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    clients = response.json()
    if not clients:
        print("[INFO] Criando cliente temporario para teste")
        requests.post(f"{BASE_URL}/clients/", headers=headers, json={"name": "Temp Test Client"})
        response = requests.get(f"{BASE_URL}/clients/", headers=headers)
        clients = response.json()
    
    client_id = clients[0]["id"]
    headers_with_client = {**headers, "X-Client-Id": str(client_id)}

    print(f"Testing for Client ID: {client_id}")

    # 1. List agents
    response = requests.get(f"{BASE_URL}/chatwoot/agents", headers=headers_with_client)
    if response.status_code != 200:
        return False, f"[ERROR] Erro ao listar agentes: {response.status_code} {response.text}"
    
    print("[SUCCESS] Listagem de agentes OK")

    # 2. Create agent
    new_agent_payload = {
        "name": "Test Agent " + os.urandom(4).hex(),
        "email": f"test_{os.urandom(4).hex()}@example.com",
        "role": "agent"
    }
    response = requests.post(f"{BASE_URL}/chatwoot/agents", json=new_agent_payload, headers=headers_with_client)
    if response.status_code != 200:
        return False, f"[ERROR] Erro ao criar agente: {response.status_code} {response.text}"
    
    created_agent = response.json()
    agent_id = created_agent.get("id")
    print(f"[SUCCESS] Criacao de agente OK (ID: {agent_id})")

    # 3. Delete agent
    if agent_id:
        response = requests.delete(f"{BASE_URL}/chatwoot/agents/{agent_id}", headers=headers_with_client)
        if response.status_code != 200:
            return False, f"[ERROR] Erro ao deletar agente: {response.status_code} {response.text}"
        
        result = response.json()
        if not result.get("success"):
            return False, f"[ERROR] Sucesso não retornado na deleção: {result}"
        
        print("[SUCCESS] Delecao de agente OK")
    
    return True, "[SUCCESS] Todas as operacoes de gestao de agentes via Chatwoot API simuladas com sucesso"

def run_feature_tests():
    print("\n--- [15] Testes de Gestão de Agentes Chatwoot ---")
    token = get_token()
    if not token:
        print("[ERROR] Nao foi possivel obter token")
        import sys
        sys.exit(1)

    results = [
        test_chatwoot_agents_management(token)
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

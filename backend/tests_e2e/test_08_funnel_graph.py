import os
import requests
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

def test_save_graph_funnel(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": "1" # Usando ID 1 por padrão
    }
    
    # 1. Obter um client_id válido se possível
    res_clients = requests.get(f"{BASE_URL}/clients/", headers=headers)
    if res_clients.status_code == 200 and res_clients.json():
        headers["X-Client-ID"] = str(res_clients.json()[0]['id'])

    payload = {
        "name": "Funil Teste Grafo",
        "description": "Teste de salvamento com estrutura de grafo",
        "trigger_phrase": "#teste_grafo",
        "steps": {
            "nodes": [
                {"id": "1", "type": "messageNode", "data": {"content": "Olá!"}, "position": {"x": 0, "y": 0}},
                {"id": "2", "type": "mediaNode", "data": {"mediaUrl": "http://link.com"}, "position": {"x": 0, "y": 100}}
            ],
            "edges": [
                {"id": "e1-2", "source": "1", "target": "2"}
            ]
        }
    }
    
    print(f"Tentando salvar funil em {BASE_URL}/funnels")
    response = requests.post(f"{BASE_URL}/funnels", headers=headers, json=payload)
    
    if response.status_code == 201 or response.status_code == 200:
        print("✅ Sucesso ao salvar funil com grafo!")
        return True, "✅ Funil com grafo salvo com sucesso"
    else:
        print(f"❌ Erro ao salvar funil: {response.status_code}")
        print(f"Resposta: {response.text}")
        return False, f"❌ Falha ao salvar: {response.status_code} - {response.text}"

if __name__ == "__main__":
    token = get_token()
    if token:
        success, msg = test_save_graph_funnel(token)
        if not success:
            import sys
            sys.exit(1)
    else:
        print("❌ Falha na autenticação")
        import sys
        sys.exit(1)

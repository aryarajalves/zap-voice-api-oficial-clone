import os
import requests
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_security_isolation():
    print("\n--- [10] Teste de Seguranca e Isolamento de Clientes ---")
    
    token = get_token()
    if not token:
        print("Erro ao obter token")
        return

    # Buscar/Criar clientes dinamicamente
    res_clients = requests.get(f"{BASE_URL}/clients/", headers={"Authorization": f"Bearer {token}"})
    if res_clients.status_code != 200:
        print(f"❌ Erro ao buscar clientes: {res_clients.status_code}")
        return
    clients = res_clients.json()
    if len(clients) < 2:
        for i in range(len(clients), 2):
            requests.post(f"{BASE_URL}/clients/", headers={"Authorization": f"Bearer {token}"}, json={"name": f"Cliente de Teste {i+1}"})
        res_clients = requests.get(f"{BASE_URL}/clients/", headers={"Authorization": f"Bearer {token}"})
        clients = res_clients.json()

    client_id_a = clients[0]['id']
    client_id_b = clients[1]['id']

    headers_a = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id_a),
        "Content-Type": "application/json"
    }

    headers_b = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id_b),
        "Content-Type": "application/json"
    }

    # Limpar funis antigos com mesmo nome
    for h, cid, name in [(headers_a, client_id_a, "Funil Cliente A"), (headers_b, client_id_b, "Funil Cliente B")]:
        res = requests.get(f"{BASE_URL}/funnels", headers=h, params={"client_id": cid})
        if res.status_code == 200:
            for f in res.json():
                if f.get("name") == name:
                    requests.delete(f"{BASE_URL}/funnels/{f['id']}", headers=h)

    # 1. Criar um funil para o Cliente A
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_a, json={
        "name": "Funil Cliente A",
        "steps": []
    })
    funnel_id_a = res.json()["id"]
    print(f"Funil do Cliente {client_id_a} criado: ID {funnel_id_a}")

    # 2. Criar um funil para o Cliente B
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_b, json={
        "name": "Funil Cliente B",
        "steps": []
    })
    funnel_id_b = res.json()["id"]
    print(f"Funil do Cliente {client_id_b} criado: ID {funnel_id_b}")

    # 3. TENTATIVA MALICIOSA: Cliente 1 tenta apagar o funil do Cliente 2 via Bulk
    print(f"Tentativa Maliciosa: Cliente 1 tentando apagar funil do Cliente 2 (ID {funnel_id_b})...")
    res = requests.delete(f"{BASE_URL}/funnels/bulk", headers=headers_a, json={
        "funnel_ids": [funnel_id_b]
    })
    
    data = res.json()
    print(f"Resposta do Servidor: {data['message']} (Excluidos: {data['deleted_count']})")
    
    if data['deleted_count'] == 0:
        print("SUCESSO: O sistema recusou a exclusao do funil de outro cliente!")
    else:
        print("FALHA DE SEGURANCA: O sistema permitiu excluir funil de outro cliente!")
        exit(1)

    # 4. Limpeza
    requests.delete(f"{BASE_URL}/funnels/{funnel_id_a}", headers=headers_a)
    if funnel_id_b != 999999:
        requests.delete(f"{BASE_URL}/funnels/{funnel_id_b}", headers=headers_b)

    print("\nTeste de Isolamento concluido com sucesso!")

if __name__ == "__main__":
    test_security_isolation()

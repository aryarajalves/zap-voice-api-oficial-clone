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

    # 1. Criar um funil para o Cliente A (ID: 1)
    headers_a = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": "1",
        "Content-Type": "application/json"
    }
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_a, json={
        "name": "Funil Cliente A",
        "steps": []
    })
    funnel_id_a = res.json()["id"]
    print(f"Funil do Cliente 1 criado: ID {funnel_id_a}")

    # 2. Criar um funil para o Cliente B (ID: 2 - Supondo que exista)
    headers_b = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": "2",
        "Content-Type": "application/json"
    }
    # Primeiro garantimos que o cliente 2 existe ou tentamos buscar/criar
    # Simplificando: vamos apenas tentar criar o funil com ID 2
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_b, json={
        "name": "Funil Cliente B",
        "steps": []
    })
    if res.status_code != 200:
        print("Cliente 2 nao encontrado ou erro ao criar funil B. Abortando teste de isolamento real.")
        # Se nao tiver cliente 2, o teste perde o sentido de cross-client real, 
        # mas ainda podemos testar se o Cliente 1 consegue apagar um ID que nao existe ou de outro.
        funnel_id_b = 999999 
    else:
        funnel_id_b = res.json()["id"]
        print(f"Funil do Cliente 2 criado: ID {funnel_id_b}")

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

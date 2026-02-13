import os
import requests
from dotenv import load_dotenv

# Carrega variaveis de ambiente
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

def test_duplicate_name():
    print("\n--- [11] Teste de Nome Duplicado ---")
    
    token = get_token()
    if not token:
        print("Erro ao obter token")
        return

    headers_1 = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": "1",
        "Content-Type": "application/json"
    }

    headers_2 = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": "2",
        "Content-Type": "application/json"
    }

    funnel_name = "Funil Unico de Teste"

    # 1. Limpar funis com esse nome se existirem
    res = requests.get(f"{BASE_URL}/funnels", headers=headers_1)
    if res.status_code == 200:
        for f in res.json():
            if f["name"] == funnel_name:
                requests.delete(f"{BASE_URL}/funnels/{f['id']}", headers=headers_1)

    # 2. Criar o primeiro funil
    print(f"Criando primeiro funil '{funnel_name}' para Cliente 1...")
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_1, json={"name": funnel_name, "steps": []})
    if res.status_code != 200:
        print(f"Erro ao criar funil base: {res.text}")
        return
    id1 = res.json()["id"]
    print("Sucesso!")

    # 3. Tentar criar outro com mesmo nome para o MESMO cliente
    print(f"Tentando criar SEGUNDO funil '{funnel_name}' para Cliente 1 (Deve FALHAR)...")
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_1, json={"name": funnel_name, "steps": []})
    if res.status_code == 400:
        print(f"OK: O sistema bloqueou o duplicado. Mensagem: {res.json()['detail']}")
    else:
        print(f"FALHA: O sistema PERMITIU nome duplicado! Status: {res.status_code}")
        exit(1)

    # 4. Tentar criar com mesmo nome para OUTRO cliente (Deve FUNCIONAR)
    print(f"Tentando criar funil '{funnel_name}' para Cliente 2 (Deve FUNCIONAR)...")
    res = requests.post(f"{BASE_URL}/funnels", headers=headers_2, json={"name": funnel_name, "steps": []})
    if res.status_code == 200:
        id2 = res.json()["id"]
        print(f"OK: Cliente 2 pode ter o mesmo nome (Isolamento confirmado). ID: {id2}")
        # Limpar o do cliente 2
        requests.delete(f"{BASE_URL}/funnels/{id2}", headers=headers_2)
    else:
        print(f"FALHA: Cliente 2 nao conseguiu criar funil com mesmo nome. Status: {res.status_code} - {res.text}")

    # 5. Limpeza final
    requests.delete(f"{BASE_URL}/funnels/{id1}", headers=headers_1)

    print("\nTeste de Nome Duplicado concluido com sucesso!")

if __name__ == "__main__":
    test_duplicate_name()

import os
import requests
from dotenv import load_dotenv

# Carregar variáveis de ambiente
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

def test_manychat_settings():
    print("\n--- Testando Configurações ManyChat ---")
    token = get_token()
    if not token:
        print("❌ Falha ao obter token de acesso")
        return False

    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter primeiro cliente para o teste
    try:
        clients_res = requests.get(f"{BASE_URL}/clients/", headers=headers)
        if clients_res.status_code != 200:
            print(f"❌ Falha ao listar clientes: {clients_res.status_code}")
            return False
        
        clients = clients_res.json()
        if not clients:
            print("❌ Nenhum cliente encontrado para teste")
            return False
            
        client_id = clients[0]['id']
        headers["x-client-id"] = str(client_id)
        print(f"✅ Usando Cliente ID: {client_id}")

        # 2. Salvar ManyChat API Key
        test_key = "12345678:manychat_api_token_test_12345678"
        save_res = requests.post(
            f"{BASE_URL}/settings/",
            headers=headers,
            json={"settings": {"MANYCHAT_API_KEY": test_key}}
        )
        
        if save_res.status_code == 200:
            print("✅ Salvar MANYCHAT_API_KEY: OK")
        else:
            print(f"❌ Erro ao salvar MANYCHAT_API_KEY: {save_res.status_code} - {save_res.text}")
            return False

        # 3. Verificar se está mascarada na listagem
        get_res = requests.get(f"{BASE_URL}/settings/", headers=headers)
        if get_res.status_code == 200:
            settings = get_res.json()
            masked_value = settings.get("MANYCHAT_API_KEY")
            if masked_value and "*" in masked_value:
                print(f"✅ Valor mascarado verificado: {masked_value}")
            else:
                print(f"❌ Valor não foi mascarado corretamente: {masked_value}")
                return False
        else:
            print(f"❌ Erro ao buscar configurações: {get_res.status_code}")
            return False

        # 4. Revelar a chave e comparar
        reveal_res = requests.post(
            f"{BASE_URL}/settings/reveal",
            headers=headers,
            json={"key": "MANYCHAT_API_KEY"}
        )
        
        if reveal_res.status_code == 200:
            revealed_data = reveal_res.json()
            if revealed_data.get("value") == test_key:
                print("✅ Revelar MANYCHAT_API_KEY: OK (Valores coincidem)")
            else:
                print(f"❌ Valor revelado incorreto! Esperado: {test_key}, Recebido: {revealed_data.get('value')}")
                return False
        else:
            print(f"❌ Erro ao revelar MANYCHAT_API_KEY: {reveal_res.status_code}")
            return False

        return True

    except Exception as e:
        print(f"❌ Erro durante o teste: {e}")
        return False

if __name__ == "__main__":
    if test_manychat_settings():
        print("\n✅ TESTE MANYCHAT CONCLUÍDO COM SUCESSO!")
        exit(0)
    else:
        print("\n❌ TESTE MANYCHAT FALHOU!")
        exit(1)

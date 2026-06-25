import os
import requests
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")
INSTAGRAM_VERIFY_TOKEN = os.getenv("INSTAGRAM_VERIFY_TOKEN", "zapvoice_instagram_token")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    return response.json().get("access_token")

def test_instagram_disabled_behavior():
    """
    Testa se as rotas do Instagram retornam HTTP 403 Forbidden ou Status 200 dependendo da variável ENABLE_INSTAGRAM.
    """
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Vamos verificar o valor atual no backend/.env para saber o que esperar
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    enabled = True
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
            if "ENABLE_INSTAGRAM=false" in content:
                enabled = False

    if not enabled:
        print("Testando comportamento com Instagram DESABILITADO (ENABLE_INSTAGRAM=false)...")
        # 1. Testar endpoint de listagem de automações
        res_list = requests.get(f"{BASE_URL}/instagram/automations", headers=headers)
        if res_list.status_code == 403 and "desabilitado" in res_list.text:
            print("✅ Endpoint administrativo do Instagram retornou 403 Forbidden com sucesso!")
        else:
            print(f"❌ Endpoint administrativo deveria retornar 403. Status: {res_list.status_code}, Resposta: {res_list.text}")
            return False

        # 2. Testar endpoint público de webhook (GET)
        params = {
            "hub.mode": "subscribe",
            "hub.verify_token": INSTAGRAM_VERIFY_TOKEN,
            "hub.challenge": "test_challenge_12345"
        }
        res_webhook = requests.get(f"{BASE_URL}/instagram/webhook", params=params)
        if res_webhook.status_code == 403 and "desabilitado" in res_webhook.text:
            print("✅ Webhook público do Instagram retornou 403 Forbidden com sucesso!")
        else:
            print(f"❌ Webhook público deveria retornar 403. Status: {res_webhook.status_code}, Resposta: {res_webhook.text}")
            return False
    else:
        print("Testando comportamento com Instagram HABILITADO (ENABLE_INSTAGRAM=true)...")
        res_list = requests.get(f"{BASE_URL}/instagram/automations", headers=headers)
        if res_list.status_code == 200:
            print("✅ Endpoint administrativo do Instagram respondeu 200 OK com sucesso!")
        else:
            print(f"❌ Endpoint administrativo deveria retornar 200. Status: {res_list.status_code}, Resposta: {res_list.text}")
            return False

    print("🎉 Todos os testes de controle de acesso do Instagram passaram com sucesso!")
    return True


if __name__ == "__main__":
    success = test_instagram_disabled_behavior()
    sys.exit(0 if success else 1)

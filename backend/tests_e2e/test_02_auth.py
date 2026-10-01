import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def test_login_success():
    print(f"Tentando login com: {ADMIN_EMAIL}")
    url = f"{BASE_URL}/auth/token"
    # O endpoint esperado pelo FastAPI OAuth2PasswordRequestForm é multipart/form-data ou x-www-form-urlencoded
    data = {
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(url, data=data, timeout=10)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return True, f"✅ Login - Sucesso! Token: {token[:15]}..."
        return False, f"❌ Login - Erro: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Login - Erro de conexão: {e}"

def test_login_failure():
    url = f"{BASE_URL}/auth/token"
    data = {
        "username": ADMIN_EMAIL,
        "password": "wrong_password"
    }
    
    try:
        response = requests.post(url, data=data, timeout=10)
        if response.status_code == 401:
            return True, "✅ Login - Falha esperada com senha incorreta"
        return False, f"❌ Login - Deveria ter falhado (401), mas retornou: {response.status_code}"
    except Exception as e:
        return False, f"❌ Login - Erro de conexão: {e}"

def run_auth_tests():
    print("\n--- [02] Testes de Autenticação ---")
    
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("⚠️ Credenciais de Super Admin não encontradas no .env")
        import sys
        sys.exit(1)

    results = [
        test_login_success(),
        test_login_failure()
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
    run_auth_tests()

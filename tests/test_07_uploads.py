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

def test_media_upload(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = response.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    # 2. Criar um arquivo PNG dummy (extensão permitida)
    file_name = "test_image.png"
    # Um PNG mínimo de 1x1 pixel em hexadecimal
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n2\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    with open(file_name, "wb") as f:
        f.write(png_data)
    
    try:
        # Endpoint: POST /api/upload (conforme openapi.json)
        with open(file_name, "rb") as f:
            files = {"file": (file_name, f, "image/png")}
            response = requests.post(f"{BASE_URL}/upload", headers=headers, files=files)
            
        if response.status_code in [200, 201]:
            file_url = response.json().get("url")
            print(f"✅ Upload - Arquivo enviado com sucesso: {file_url}")
            return True, "✅ Fluxo de upload validado"
        return False, f"❌ Upload - Erro: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"❌ Upload - Erro de conexão: {e}"
    finally:
        if os.path.exists(file_name):
            os.remove(file_name)

def run_upload_tests():
    print("\n--- [07] Testes de Upload de Mídia ---")
    token = get_token()
    if not token:
        import sys
        sys.exit(1)

    results = [
        test_media_upload(token)
    ]
    
    all_success = True
    for success, msg in results:
        print(msg)
        if not success: all_success = False
    
    if not all_success:
        import sys
        sys.exit(1)

if __name__ == "__main__":
    run_upload_tests()

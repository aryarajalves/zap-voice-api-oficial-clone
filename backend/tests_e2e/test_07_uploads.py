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

def test_list_uploaded_media(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = response.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    # 2. Fazer upload de uma imagem de teste
    file_name = "test_list_image.png"
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n2\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    with open(file_name, "wb") as f:
        f.write(png_data)
        
    try:
        with open(file_name, "rb") as f:
            files = {"file": (file_name, f, "image/png")}
            resp_upload = requests.post(f"{BASE_URL}/upload", headers=headers, files=files)
        
        if resp_upload.status_code not in [200, 201]:
            return False, f"❌ Listagem - Erro no upload: {resp_upload.status_code} - {resp_upload.text}"
            
        uploaded_url = resp_upload.json().get("url")
        
        # 3. Chamar a listagem /uploads/list
        resp_list = requests.get(f"{BASE_URL}/uploads/list", headers=headers)
        if resp_list.status_code != 200:
            return False, f"❌ Listagem - Erro ao obter lista: {resp_list.status_code} - {resp_list.text}"
            
        data = resp_list.json()
        medias = data.get("items", [])
        found = any(m["url"] == uploaded_url for m in medias)
        
        if found:
            print("✅ Listagem de Mídias - Upload registrado e recuperado com sucesso!")
            return True, "✅ Listagem de mídias validada"
        return False, "❌ Listagem de Mídias - Upload enviado não encontrado na lista"
    except Exception as e:
        return False, f"❌ Listagem de Mídias - Erro: {e}"
    finally:
        if os.path.exists(file_name):
            os.remove(file_name)

def test_rename_and_delete_media(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = response.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    # 2. Upload temporário
    file_name = "test_rename_del.png"
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n2\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    with open(file_name, "wb") as f:
         f.write(png_data)
         
    try:
        with open(file_name, "rb") as f:
            files = {"file": (file_name, f, "image/png")}
            resp_upload = requests.post(f"{BASE_URL}/upload", headers=headers, files=files)
            
        if resp_upload.status_code not in [200, 201]:
            return False, f"❌ Rename/Delete - Falha no upload: {resp_upload.status_code}"
            
        # Obter ID da mídia criada
        resp_list = requests.get(f"{BASE_URL}/uploads/list", headers=headers)
        items = resp_list.json().get("items", [])
        uploaded_item = next((item for item in items if item["filename"] == "test_rename_del.png"), None)
        
        if not uploaded_item:
            return False, "❌ Rename/Delete - Mídia não encontrada na listagem pós-upload"
            
        media_id = uploaded_item["id"]
        
        # 3. Testar Renomeação
        rename_payload = {"filename": "novo_nome_test.png"}
        resp_rename = requests.patch(f"{BASE_URL}/uploads/{media_id}/rename", headers=headers, json=rename_payload)
        
        if resp_rename.status_code != 200 or resp_rename.json().get("filename") != "novo_nome_test.png":
            return False, f"❌ Rename/Delete - Falha na renomeação: {resp_rename.status_code} - {resp_rename.text}"
            
        # 4. Testar Deleção
        resp_del = requests.delete(f"{BASE_URL}/uploads/{media_id}", headers=headers)
        if resp_del.status_code != 200:
            return False, f"❌ Rename/Delete - Falha na exclusão: {resp_del.status_code}"
            
        # Validar se sumiu da listagem
        resp_list_after = requests.get(f"{BASE_URL}/uploads/list", headers=headers)
        items_after = resp_list_after.json().get("items", [])
        still_exists = any(item["id"] == media_id for item in items_after)
        
        if still_exists:
            return False, "❌ Rename/Delete - Registro de mídia ainda existe após delete"
            
        print("✅ Renomeação e Deleção de Mídias validadas com sucesso!")
        return True, "✅ Renomeação e deleção de mídias validadas"
        
    except Exception as e:
        return False, f"❌ Rename/Delete - Erro: {e}"
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
        test_media_upload(token),
        test_list_uploaded_media(token),
        test_rename_and_delete_media(token)
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

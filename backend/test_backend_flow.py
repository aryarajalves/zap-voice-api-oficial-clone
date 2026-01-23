
import requests
import os

BASE_URL = "http://localhost:8000"

def test_upload_and_funnel_flow():
    print("🚀 Iniciando Teste de Fluxo Completo: Upload -> Criação de Funil -> Verificação")

    # 1. Testar Upload
    print("\n[1/3] Testando Upload de Arquivo...")
    
    # Criar arquivo dummy
    with open("test_image.png", "wb") as f:
        f.write(os.urandom(1024)) # 1KB de dados randômicos
    
    files = {'file': ('test_image.png', open('test_image.png', 'rb'), 'image/png')}
    
    try:
        response = requests.post(f"{BASE_URL}/upload", files=files)
        if response.status_code != 200:
            print(f"❌ Falha no Upload: {response.status_code} - {response.text}")
            return
        
        data = response.json()
        uploaded_url = data.get("url")
        print(f"✅ Upload Sucesso! URL gerada: {uploaded_url}")
        
    except Exception as e:
        print(f"❌ Erro de conexão no upload: {e}")
        return

    # 2. Verificar se a URL é acessível (se o arquivo está sendo servido)
    print("\n[2/3] Verificando se a imagem está acessível via URL...")
    try:
        get_response = requests.get(uploaded_url)
        if get_response.status_code == 200:
            print("✅ Arquivo acessível via HTTP (Status 200)")
        else:
            print(f"❌ Arquivo NÃO acessível: Status {get_response.status_code}")
            return
    except Exception as e:
         print(f"❌ Erro ao acessar URL: {e}")

    # 3. Criar Funil com essa imagem
    print("\n[3/3] Criando Funil com o arquivo...")
    funnel_data = {
        "name": "Funil de Teste Automatizado",
        "description": "Criado pelo script de verificação",
        "steps": [
            {
                "id": "step1",
                "type": "image",
                "content": uploaded_url
            }
        ]
    }
    
    try:
        create_resp = requests.post(f"{BASE_URL}/funnels", json=funnel_data)
        if create_resp.status_code == 200:
            funnel_id = create_resp.json().get("id")
            print(f"✅ Funil criado com ID: {funnel_id}")
            
            # 4. Ler o funil de volta e verificar o dado
            read_resp = requests.get(f"{BASE_URL}/funnels/{funnel_id}")
            saved_data = read_resp.json()
            saved_step = saved_data["steps"][0]
            
            if saved_step["content"] == uploaded_url:
                print("✅ PERSISTÊNCIA CONFIRMADA: O banco salvou a URL corretamente.")
            else:
                print(f"❌ ERRO DE PERSISTÊNCIA: Esperado '{uploaded_url}', veio '{saved_step['content']}'")
        else:
            print(f"❌ Falha ao criar funil: {create_resp.text}")
            
    except Exception as e:
        print(f"❌ Erro ao criar funil: {e}")

    # Limpeza
    try:
        os.remove("test_image.png")
    except:
        pass

if __name__ == "__main__":
    test_upload_and_funnel_flow()

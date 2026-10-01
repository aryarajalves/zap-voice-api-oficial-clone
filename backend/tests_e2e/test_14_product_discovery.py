import os
import requests
import uuid
import json
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

def test_product_discovery_and_filtering(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Obter client_id
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = response.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)
    
    print("\n[STEP 1] Criando integração para teste...")
    integration_data = {
        "name": f"Test Integration {uuid.uuid4().hex[:4]}",
        "platform": "eduzz",
        "status": "active"
    }
    resp = requests.post(f"{BASE_URL}/webhooks", headers=headers, json=integration_data)
    if resp.status_code not in [200, 201]:
        return False, f"Falha ao criar integração: {resp.text}"
    
    integration = resp.json()
    int_id = integration['id']
    webhook_url = f"{BASE_URL}/webhooks/external/{int_id}"
    
    print(f"[STEP 2] Enviando webhook com múltiplos produtos e preços (Eduzz style)...")
    # Payload com nomes compostos e preços
    payload = {
        "data": {
            "status": "paid",
            "buyer": {
                "name": "Test User",
                "email": "test@example.com",
                "cellphone": "5511999999999"
            },
            "items": [
                {"name": "Produto Alpha", "price": {"value": 100, "currency": "BRL"}},
                {"name": "Produto Beta", "price": {"value": 50, "currency": "BRL"}}
            ]
        }
    }
    
    resp = requests.post(webhook_url, json=payload)
    if resp.status_code != 200:
        return False, f"Falha ao enviar webhook: {resp.text}"
    
    print("[STEP 3] Verificando se os produtos foram descobertos INDIVIDUALMENTE e sem preços...")
    # Forçamos uma busca no histórico se necessário, ou pegamos a integração atualizada
    resp = requests.get(f"{BASE_URL}/webhooks/{int_id}", headers=headers)
    updated_int = resp.json()
    discovered = updated_int.get("discovered_products", [])
    
    print(f"Produtos descobertos: {discovered}")
    
    if "Produto Alpha" not in discovered or "Produto Beta" not in discovered:
        return False, f"Falha na descoberta individual. Esperado Alpha e Beta separadamente. Recebido: {discovered}"
    
    # Check if price info leaked into the names (it shouldn't if my regex/parser works)
    for p in discovered:
        if "BRL" in p or "100" in p or "(" in p:
            return False, f"Nome do produto contém informação de preço: {p}"

    print("[STEP 4] Testando filtragem global por produto (Whitelist)...")
    # Ativa filtragem e permite apenas Alpha
    update_data = {
        "name": integration['name'], # Name is required
        "platform": integration['platform'],
        "status": integration['status'],
        "product_filtering": True,
        "product_whitelist": ["Produto Alpha"],
        "mappings": []
    }
    requests.put(f"{BASE_URL}/webhook-integrations/{int_id}", headers=headers, json=update_data)
    
    # Envia webhook com "Produto Gamma" (não permitido)
    payload_gamma = {
        "data": {
            "status": "paid",
            "buyer": {"name": "User Gamma", "cellphone": "5511888888888"},
            "items": [{"name": "Produto Gamma"}]
        }
    }
    resp = requests.post(webhook_url, json=payload_gamma)
    if resp.json().get("reason") != "product_not_allowed":
         return False, f"Produto Gamma deveria ser bloqueado pela whitelist. Resposta: {resp.json()}"
    
    # Envia webhook com "Produto Alpha | Produto Beta"
    # Deve passar pela whitelist (Alpha está nela) mas retornar no_mapping (já que não criamos mappings)
    resp = requests.post(webhook_url, json=payload)
    if resp.json().get("reason") != "no_mapping_for_event_compra_aprovada":
         return False, f"Webhook com Produto Alpha deveria ter passado pela whitelist. Resposta: {resp.json()}"

    print("[STEP 5] Limpando dados de teste...")
    requests.delete(f"{BASE_URL}/webhooks/{int_id}", headers=headers)
    
    return True, "STEP 5: Teste de Descoberta e Filtragem de Produtos concluído com sucesso!"

if __name__ == "__main__":
    token = get_token()
    if not token:
        print("Erro ao obter token")
        exit(1)
    
    success, msg = test_product_discovery_and_filtering(token)
    print(msg)
    if not success:
        exit(1)

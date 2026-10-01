import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")
CLIENT_ID = 1  # Cliente padrão de teste

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    print(f"[ERRO] Erro ao obter token: {response.status_code} - {response.text}")
    return None

def test_leads_public_api():
    print("\n--- [20] Teste de API Publica de Leads (Google Agenda) ---")
    
    jwt_token = get_token()
    if not jwt_token:
        print("[ERRO] Falha ao obter JWT Token para gerar API Key")
        return False

    # 1. Gerar uma API Key
    api_key_url = f"{BASE_URL}/api-keys"
    headers_jwt = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(CLIENT_ID)
    }
    payload_key = {"name": "Test Key Calendar API"}
    
    res_key = requests.post(api_key_url, headers=headers_jwt, json=payload_key)
    if res_key.status_code != 200:
        print(f"[ERRO] Falha ao criar API Key: {res_key.status_code} - {res_key.text}")
        return False
        
    api_key_data = res_key.json()
    api_key = api_key_data["api_key"]
    api_key_id = api_key_data["id"]
    print(f"[OK] API Key gerada com sucesso! Prefixo: {api_key_data['token_prefix']}")

    # Headers para chamadas da API pública
    headers_public = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # 2. Testar criação de lead via API pública
    phone_test = "5585991112222"
    lead_payload = {
        "name": "Maria Teste Agenda",
        "email": "maria.agenda@teste.com",
        "google_calendar_link": "https://calendar.google.com/calendar/event?eid=MTIzNDU2",
        "event_datetime": "2026-07-20T14:30:00Z",
        "tags": "teste_agenda, google_calendar",
        "product_name": "Mentoria ZapVoice",
        "payment_method": "credit_card",
        "price": "497.00",
        "variables": {
            "origem": "api_teste",
            "vendedor": "Robo Automatico"
        }
    }

    print(f"Criando novo lead para o telefone: {phone_test}...")
    update_url = f"{BASE_URL}/leads/public/{phone_test}/update"
    
    res_upsert = requests.post(update_url, headers=headers_public, json=lead_payload)
    if res_upsert.status_code != 200:
        print(f"[ERRO] Erro ao criar lead via API publica: {res_upsert.status_code} - {res_upsert.text}")
        return False
        
    lead_data = res_upsert.json()
    print("[OK] Lead criado com sucesso!")
    
    # Validações dos campos retornados
    assert lead_data["phone"] == phone_test
    assert lead_data["name"] == "Maria Teste Agenda"
    assert lead_data["email"] == "maria.agenda@teste.com"
    assert lead_data["google_calendar_link"] == "https://calendar.google.com/calendar/event?eid=MTIzNDU2"
    assert "2026-07-20" in lead_data["event_datetime"]
    assert lead_data["tags"] == "teste_agenda, google_calendar"
    assert lead_data["product_name"] == "Mentoria ZapVoice"
    assert lead_data["price"] == "497.00"
    assert lead_data["variables"]["origem"] == "api_teste"
    assert lead_data["variables"]["vendedor"] == "Robo Automatico"
    print("[OK] Validacoes de criacao aprovadas!")

    # 3. Testar atualização do mesmo lead
    updated_payload = {
        "name": "Maria Teste Agenda Atualizada",
        "google_calendar_link": "https://calendar.google.com/calendar/event?eid=Nzg5MDEy",
        "variables": {
            "vendedor": "Robo Atualizado",
            "status": "agendado"
        }
    }

    print("Atualizando o lead existente...")
    res_update = requests.post(update_url, headers=headers_public, json=updated_payload)
    if res_update.status_code != 200:
        print(f"[ERRO] Erro ao atualizar lead via API publica: {res_update.status_code} - {res_update.text}")
        return False
        
    updated_data = res_update.json()
    print("[OK] Lead atualizado com sucesso!")
    
    # Validações da atualização
    assert updated_data["phone"] == phone_test
    assert updated_data["name"] == "Maria Teste Agenda Atualizada"
    assert updated_data["google_calendar_link"] == "https://calendar.google.com/calendar/event?eid=Nzg5MDEy"
    # O e-mail deve permanecer intacto (PATCH semântico)
    assert updated_data["email"] == "maria.agenda@teste.com"
    # As variáveis devem ser mescladas
    assert updated_data["variables"]["origem"] == "api_teste"
    assert updated_data["variables"]["vendedor"] == "Robo Atualizado"
    assert updated_data["variables"]["status"] == "agendado"
    print("[OK] Validacoes de atualizacao aprovadas!")

    # 4. Testar erro de autenticação (API Key inválida)
    invalid_headers = {
        "Authorization": "Bearer zv_live_invalidkey1234567890",
        "Content-Type": "application/json"
    }
    print("Testando requisicao com API Key invalida...")
    res_invalid = requests.post(update_url, headers=invalid_headers, json=updated_payload)
    assert res_invalid.status_code == 401
    print("[OK] Autenticacao rejeitada corretamente com status 401!")

    # 5. Remover a API Key gerada para limpeza do banco
    print("Removendo chave de API de teste...")
    del_key_url = f"{BASE_URL}/api-keys/{api_key_id}"
    res_del_key = requests.delete(del_key_url, headers=headers_jwt)
    if res_del_key.status_code == 200:
        print("[OK] Chave de API de teste deletada com sucesso!")
    else:
        print(f"[INFO] Status de delecao de chave: {res_del_key.status_code}")

    print("[INFO] Todos os testes de API Publica de Leads passaram com sucesso!")
    return True

if __name__ == "__main__":
    success = test_leads_public_api()
    if not success:
        import sys
        sys.exit(1)

import os
import requests
from datetime import datetime, timezone, timedelta
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

def test_appointments_reminder_flow():
    print("\n--- [21] Teste do Fluxo de Lembretes de Agendamento ---")
    
    jwt_token = get_token()
    if not jwt_token:
        print("[ERRO] Falha ao obter JWT Token")
        return False

    headers_jwt = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(CLIENT_ID),
        "Content-Type": "application/json"
    }

    # 1. Configurar lembretes nas configurações do cliente
    settings_url = f"{BASE_URL}/settings/"
    settings_payload = {
        "settings": {
            "APPOINTMENTS_ENABLED": "true",
            "APPOINTMENTS_REMINDER_MINUTES": "30",
            "APPOINTMENTS_REMINDER_TEMPLATE": "lembrete_consulta_teste"
        }
    }
    
    print("Atualizando configurações de agendamento...")
    res_set = requests.post(settings_url, headers=headers_jwt, json=settings_payload)
    assert res_set.status_code == 200, f"Falha ao salvar config: {res_set.text}"
    print("[OK] Configurações de agendamento atualizadas com sucesso!")

    # 2. Gerar uma API Key para criar contato
    api_key_url = f"{BASE_URL}/api-keys"
    res_key = requests.post(api_key_url, headers=headers_jwt, json={"name": "Test Key Calendar Reminder"})
    assert res_key.status_code == 200, f"Falha ao criar API Key: {res_key.text}"
    api_key_data = res_key.json()
    api_key = api_key_data["api_key"]

    headers_public = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # 3. Criar lead com agendamento para daqui a 20 minutos (dentro da janela de 30 min)
    phone_test = "5585991113333"
    future_time = datetime.now(timezone.utc) + timedelta(minutes=20)
    lead_payload = {
        "name": "Pedro Teste Lembrete",
        "email": "pedro.lembrete@teste.com",
        "google_calendar_link": "https://calendar.google.com/calendar/event?eid=YWJjMTIz",
        "event_datetime": future_time.isoformat(),
        "tags": "agendamento_ativo",
        "variables": {}
    }

    print(f"Criando contato agendado para o telefone: {phone_test}...")
    update_url = f"{BASE_URL}/leads/public/{phone_test}/update"
    res_upsert = requests.post(update_url, headers=headers_public, json=lead_payload)
    assert res_upsert.status_code == 200, f"Falha ao upsert lead: {res_upsert.text}"
    
    lead_data = res_upsert.json()
    assert lead_data["google_calendar_reminder_sent"] is False
    print("[OK] Contato agendado criado com lembrete pendente (False)!")

    # 4. Simular reagendamento: se a data for atualizada para uma nova data futura,
    # a flag de lembrete enviado deve continuar False (ou ser resetada)
    new_future_time = datetime.now(timezone.utc) + timedelta(minutes=45)
    lead_payload["event_datetime"] = new_future_time.isoformat()
    print("Simulando reagendamento do contato para outra data/hora...")
    res_upsert_reag = requests.post(update_url, headers=headers_public, json=lead_payload)
    assert res_upsert_reag.status_code == 200
    lead_reag_data = res_upsert_reag.json()
    assert lead_reag_data["google_calendar_reminder_sent"] is False
    print("[OK] Reagendamento manteve a flag de envio pendente em False!")

    print("[OK] Teste de lembrete de agendamento concluído com sucesso!")
    return True

if __name__ == "__main__":
    test_appointments_reminder_flow()

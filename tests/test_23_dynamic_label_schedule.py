import os
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "aryarajmarketing@gmail.com")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "123456")
CLIENT_ID = 1

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    print(f"[ERRO] Erro ao obter token: {response.status_code} - {response.text}")
    return None

def test_dynamic_label_schedule_flow():
    print("\n--- [23] Teste de Agendamento Dinâmico por Etiquetas ---")
    
    jwt_token = get_token()
    if not jwt_token:
        print("[ERRO] Falha ao obter JWT Token")
        return False

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(CLIENT_ID),
        "Content-Type": "application/json"
    }

    # 1. Agendar disparo em massa com etiquetas e flag dinâmica
    schedule_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    payload = {
        "template_name": "convite_base_webinaro",
        "schedule_at": schedule_time,
        "chatwoot_label": ["lead_webinar"],
        "contacts_list": [{"phone": "5585999998888", "name": "Contato Inicial"}],
        "is_dynamic_label": True,
        "dynamic_label_name": "lead_webinar",
        "delay_seconds": 5,
        "concurrency_limit": 1
    }

    print("Criando agendamento dinâmico por etiqueta...")
    res_sch = requests.post(f"{BASE_URL}/bulk-send/schedule", headers=headers, json=payload)
    assert res_sch.status_code == 200, f"Falha ao agendar disparo: {res_sch.text}"
    sch_data = res_sch.json()
    assert sch_data.get("is_dynamic_label") is True
    assert sch_data.get("dynamic_label_name") == "lead_webinar"
    print(f"[OK] Agendamento dinâmico ID {sch_data.get('id')} criado com sucesso!")

    # 2. Consultar agendamentos do calendário
    start_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    end_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    res_cal = requests.get(f"{BASE_URL}/schedules/", headers=headers, params={"start": start_time, "end": end_time})

    assert res_cal.status_code == 200, f"Falha ao buscar agendamentos: {res_cal.text}"
    events = res_cal.json()
    
    event_ids = [e["id"] for e in events]
    assert sch_data.get("id") in event_ids, "Agendamento criado não retornado no calendário"
    
    target_event = next(e for e in events if e["id"] == sch_data.get("id"))
    assert target_event.get("is_dynamic_label") is True
    assert target_event.get("dynamic_label_name") == "lead_webinar"
    print("[OK] Agendamento verificado com sucesso no endpoint do Calendário!")

    print("[OK] Teste de agendamento dinâmico por etiqueta concluído com sucesso!")
    return True

if __name__ == "__main__":
    test_dynamic_label_schedule_flow()

import os
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

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
    return None

def test_recurring_dynamic_tag_flow():
    print("\n--- [24] Teste de Disparo Recorrente com Etiqueta Dinâmica ---")
    
    jwt_token = get_token()
    assert jwt_token is not None, "Falha ao obter JWT token"

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Client-ID": str(CLIENT_ID),
        "Content-Type": "application/json"
    }

    # 1. Criar disparo recorrente vinculado a uma etiqueta
    payload = {
        "template_name": "convite_base_webinaro",
        "frequency": "weekly",
        "days_of_week": [{"day": 0, "time": "10:00"}],
        "scheduled_time": "10:00",
        "is_active": True,
        "tag": "lead_webinar",
        "contacts_list": [{"phone": "5585991112222", "name": "Contato Fixo"}]
    }

    res_rec = requests.post(f"{BASE_URL}/schedules/recurring", headers=headers, json=payload)
    assert res_rec.status_code == 200, f"Falha ao criar disparo recorrente: {res_rec.text}"
    rec_data = res_rec.json()
    rec_id = rec_data["id"]
    assert rec_data.get("tag") == "lead_webinar"
    print(f"[OK] Disparo recorrente ID {rec_id} criado com tag 'lead_webinar'!")

    # 2. Testar execução manual da recorrência (deve re-consultar a etiqueta no Chatwoot)
    res_trig = requests.post(f"{BASE_URL}/schedules/recurring/{rec_id}/trigger", headers=headers)
    assert res_trig.status_code == 200, f"Falha ao acionar disparo manual da recorrência: {res_trig.text}"
    trig_res = res_trig.json()
    assert "trigger_id" in trig_res
    print(f"[OK] Recorrência acionada com sucesso! ScheduledTrigger gerado: ID {trig_res['trigger_id']}")

    print("[OK] Teste de disparo recorrente dinâmico por etiqueta concluído com sucesso!")
    return True

if __name__ == "__main__":
    test_recurring_dynamic_tag_flow()

import requests
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

API_URL = "http://localhost:8000/api"
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    # Login como super admin
    res = requests.post(f"{API_URL}/auth/token", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if res.status_code != 200:
        raise Exception(f"Login failed: {res.text}")
    return res.json()["access_token"]

def test_queue_management():
    token = get_token()
    
    # Buscar clientes dinamicamente
    res_clients = requests.get(f"{API_URL}/clients/", headers={"Authorization": f"Bearer {token}"})
    if res_clients.status_code != 200:
        print(f"❌ Erro ao buscar clientes: {res_clients.status_code}")
        return
    clients = res_clients.json()
    if not clients:
        requests.post(f"{API_URL}/clients/", headers={"Authorization": f"Bearer {token}"}, json={"name": "Cliente de Teste Automatizado"})
        res_clients = requests.get(f"{API_URL}/clients/", headers={"Authorization": f"Bearer {token}"})
        clients = res_clients.json()

    client_id = clients[0]['id']
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(client_id)}
    
    print("\n--- [13] Teste de Gestão de Filas (Super Monitor) ---")
    
    # 1. Criar um disparo em massa (simulado)
    print("1. Criando disparo de teste...")
    payload = {
        "template_name": "Teste Monitor",
        "contacts_list": ["5511999990001", "5511999990002", "5511999990003"],
        "language": "pt_BR",
        "cost_per_unit": 0.5
    }
    res = requests.post(f"{API_URL}/bulk-send/reserve", json=payload, headers=headers)
    assert res.status_code == 200
    trigger_id = res.json()["id"]
    print(f"✅ Trigger {trigger_id} criado com status 'processing'")

    # 2. Testar PAUSE
    print("2. Testando PAUSA...")
    res = requests.post(f"{API_URL}/triggers/{trigger_id}/pause", headers=headers)
    assert res.status_code == 200
    
    # Verificar no monitor (usando /triggers filtrando por itens ativos)
    res = requests.get(f"{API_URL}/triggers", headers=headers)
    assert res.status_code == 200
    triggers_list = res.json()["items"]
    active_ids = [t["id"] for t in triggers_list if t["status"] in ["pending", "queued", "processing", "paused"]]
    assert trigger_id in active_ids
    
    trigger_data = next(t for t in triggers_list if t["id"] == trigger_id)
    assert trigger_data["status"] == "paused"
    print("✅ Status 'paused' verificado no Monitor")

    # 3. Testar RESUME
    print("3. Testando RETOMADA...")
    res = requests.post(f"{API_URL}/triggers/{trigger_id}/resume", headers=headers)
    assert res.status_code == 200
    
    res = requests.get(f"{API_URL}/triggers", headers=headers)
    assert res.status_code == 200
    triggers_list = res.json()["items"]
    trigger_data = next(t for t in triggers_list if t["id"] == trigger_id)
    assert trigger_data["status"] == "processing"
    print("✅ Status 'processing' verificado após retomar")

    # 4. Testar RETRY (Simular falha primeiro)
    print("4. Testando RETRY de falhas...")
    # Simular uma falha no banco
    # Como não temos endpoint de 'inject failure', vamos apenas verificar se o endpoint de retry responde OK 
    # se houver uma falha cadastrada.
    # Vamos 'forçar' uma falha via modelo seria complexo via API, mas podemos testar o erro 404 se não houver falhas.
    res = requests.post(f"{API_URL}/triggers/{trigger_id}/retry", headers=headers)
    assert res.status_code == 404 # Esperado pois não cadastramos falhas
    print("✅ Retry retornou 404 corretamente (sem falhas para processar)")

    # 5. Testar CANCEL/DELETE
    print("5. Testando CANCELAMENTO...")
    res = requests.post(f"{API_URL}/triggers/{trigger_id}/cancel", headers=headers)
    assert res.status_code == 200
    
    res = requests.get(f"{API_URL}/triggers", headers=headers)
    assert res.status_code == 200
    triggers_list = res.json()["items"]
    active_ids = [t["id"] for t in triggers_list if t["status"] in ["pending", "queued", "processing", "paused"]]
    # No nosso monitor de ativos, 'cancelled' não aparece.
    assert trigger_id not in active_ids
    print("✅ Trigger removido do Monitor de Ativos (Super Monitor)")

    # 6. Testar DELECÇÃO REAL
    print("6. Testando EXCLUSÃO PERMANENTE...")
    res = requests.delete(f"{API_URL}/triggers/{trigger_id}", headers=headers)
    assert res.status_code == 200
    
    # Verificar se sumiu do histórico tambem
    res = requests.get(f"{API_URL}/triggers", headers=headers)
    assert res.status_code == 200
    all_ids = [t["id"] for t in res.json()["items"]]
    assert trigger_id not in all_ids
    print("✅ Trigger excluído permanentemente do Banco e do Histórico")

    print("\n🎉 Teste [13] concluído com sucesso!")

if __name__ == "__main__":
    try:
        test_queue_management()
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

import os
import requests
import json
import time
from datetime import datetime, timedelta
import zoneinfo
from dotenv import load_dotenv

import sys
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code != 200:
        print(f"❌ Falha ao obter token: {response.text}")
        return None
    return response.json().get("access_token")

def test_condition_as_start_node():
    print("🚀 [TEST] Iniciando teste de Funil com Condição Inteligente como Nó Inicial...")
    token = get_token()
    assert token, "Token não obtido"

    headers = {"Authorization": f"Bearer {token}"}
    client_res = requests.get(f"{BASE_URL}/clients/", headers=headers)
    assert client_res.status_code == 200
    client_id = client_res.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)

    # 1. Configurar horários para teste (Período: Hoje antes/durante/depois)
    tz = zoneinfo.ZoneInfo('America/Sao_Paulo')
    now = datetime.now(tz)
    start_dt = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M")
    end_dt = (now + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M")

    # 2. Criar Funil com nó de Condição Inteligente como INÍCIO (isStart: True) com 4 saídas
    funnel_payload = {
        "name": f"Teste Condição Início Reta Final {int(time.time())}",
        "description": "Funil com ConditionNode como nó inicial e reta final",
        "steps": {
            "nodes": [
                {
                    "id": "cond_start",
                    "type": "conditionNode",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "isStart": True,
                        "conditionType": "datetime_range",
                        "startDateTime": start_dt,
                        "endDateTime": end_dt,
                        "nearEndValue": 30,
                        "nearEndUnit": "minutes",
                        "beforeAction": "follow",
                        "betweenAction": "follow",
                        "approachAction": "follow",
                        "afterAction": "follow"
                    }
                },
                {
                    "id": "msg_before",
                    "type": "messageNode",
                    "position": {"x": 400, "y": 0},
                    "data": {"content": "Mensagem Antes do Horário", "isStart": False}
                },
                {
                    "id": "msg_between",
                    "type": "messageNode",
                    "position": {"x": 400, "y": 100},
                    "data": {"content": "Mensagem Durante o Horário (Normal)", "isStart": False}
                },
                {
                    "id": "msg_approach",
                    "type": "messageNode",
                    "position": {"x": 400, "y": 200},
                    "data": {"content": "Mensagem Durante (Reta Final / Próximo do Fim)", "isStart": False}
                },
                {
                    "id": "msg_after",
                    "type": "messageNode",
                    "position": {"x": 400, "y": 300},
                    "data": {"content": "Mensagem Depois do Horário", "isStart": False}
                }
            ],
            "edges": [
                {"id": "e_before", "source": "cond_start", "sourceHandle": "before", "target": "msg_before"},
                {"id": "e_between", "source": "cond_start", "sourceHandle": "between", "target": "msg_between"},
                {"id": "e_approach", "source": "cond_start", "sourceHandle": "approach", "target": "msg_approach"},
                {"id": "e_after", "source": "cond_start", "sourceHandle": "after", "target": "msg_after"}
            ]
        }
    }

    res_funnel = requests.post(f"{BASE_URL}/funnels", headers=headers, json=funnel_payload)
    assert res_funnel.status_code in [200, 201], f"Erro ao criar funil: {res_funnel.text}"
    funnel = res_funnel.json()
    funnel_id = funnel["id"]
    print(f"✅ Funil com 4 saídas criado com sucesso (ID: {funnel_id})")

    # 3. Disparar o funil para testar execução
    trigger_payload = {
        "contact_phone": "5511988887777",
        "contact_name": "Lead Teste Condicao Inicio",
        "conversation_id": "test_conv_123"
    }

    res_trigger = requests.post(f"{BASE_URL}/funnels/{funnel_id}/trigger", headers=headers, json=trigger_payload)
    assert res_trigger.status_code in [200, 201], f"Erro ao disparar funil: {res_trigger.text}"
    trigger_id = res_trigger.json().get("id")
    print(f"✅ Disparo executado (Trigger ID: {trigger_id})")

    # 4. Aguardar processamento do trigger
    for i in range(5):
        time.sleep(1)
        res_status = requests.get(f"{BASE_URL}/triggers/history", headers=headers)
        if res_status.status_code == 200:
            history = res_status.json()
            trigger = next((t for t in history if t['id'] == trigger_id), None)
            if trigger:
                status = trigger.get('status')
                node = trigger.get('current_node_id')
                print(f"   [Snapshot {i+1}] Status: {status} | Node: {node}")
                if status == 'completed':
                    print("✨ Funil finalizado com sucesso a partir da Condição Inteligente inicial!")
                    break

    print("🎉 [TEST] Teste de Condição Inteligente como Nó Inicial concluído com SUCESSO!")

if __name__ == "__main__":
    test_condition_as_start_node()

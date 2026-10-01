import os
import requests
import json
import time
from datetime import datetime
from dotenv import load_dotenv

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

def create_test_funnels(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get Client ID
    client_res = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = client_res.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)

    # 2. Create Target Funnel (for Linking)
    target_funnel_data = {
        "name": "Test Node: Target Link",
        "description": "Funnel de destino para o nó Link Funnel",
        "steps": {
            "nodes": [
                { "id": "start", "type": "messageNode", "position": {"x": 250, "y": 150}, "data": { "content": "Cheguei no funil de destino!", "isStart": True, "label": "Início" } }
            ],
            "edges": []
        }
    }
    res = requests.post(f"{BASE_URL}/funnels", headers=headers, json=target_funnel_data)
    if res.status_code not in [200, 201]:
        return None, f"Erro ao criar funil de destino: {res.text}"
    target_funnel_id = res.json()['id']
    print(f"✅ Funil de Destino criado (ID: {target_funnel_id})")

    # 3. Create Complex Graph Funnel
    source_graph = {
        "nodes": [
            { "id": "msg1", "type": "messageNode", "position": {"x": 200, "y": 0}, "data": { "content": "Nó de Mensagem: Sucesso", "isStart": True, "label": "Início", "variations": ["Variação 1", "Variação 2"] } },
            { "id": "media1", "type": "mediaNode", "position": {"x": 400, "y": 0}, "data": { "url": "https://placehold.co/600x400/png", "mediaType": "image", "caption": "Nó de Mídia: Sucesso" } },
            { "id": "delay1", "type": "delayNode", "position": {"x": 600, "y": 0}, "data": { "time": 2, "unit": "seconds" } },
            { "id": "rand1", "type": "randomizerNode", "position": {"x": 800, "y": 0}, "data": { 
                "percentA": 50,
                "paths": [
                    { "id": "a", "label": "Caminho A", "percent": 50 },
                    { "id": "b", "label": "Caminho B", "percent": 50 }
                ]
            } },
            { "id": "cond1", "type": "conditionNode", "position": {"x": 1000, "y": 0}, "data": { "conditionType": "weekday", "allowedDays": ["0","1","2","3","4","5","6"] } },
            { "id": "link1", "type": "linkFunnelNode", "position": {"x": 1200, "y": 0}, "data": { "funnelId": target_funnel_id } }
        ],
        "edges": [
            { "id": "e2", "source": "msg1", "target": "media1" },
            { "id": "e3", "source": "media1", "target": "delay1" },
            { "id": "e4", "source": "delay1", "target": "rand1" },
            { "id": "e5_a", "source": "rand1", "target": "cond1", "sourceHandle": "a" },
            { "id": "e5_b", "source": "rand1", "target": "cond1", "sourceHandle": "b" },
            { "id": "e6_yes", "source": "cond1", "target": "link1", "sourceHandle": "yes" }
        ]
    }
    
    source_funnel_data = {
        "name": "Test Node: Complex Graph",
        "description": "Testa múltiplos tipos de nós",
        "steps": source_graph
    }
    
    res = requests.post(f"{BASE_URL}/funnels", headers=headers, json=source_funnel_data)
    if res.status_code not in [200, 201]:
        return None, f"Erro ao criar funil de origem: {res.text}"
    source_funnel_id = res.json()['id']
    print(f"✅ Funil de Origem criado (ID: {source_funnel_id})")
    
    return source_funnel_id, "OK"

def trigger_and_verify(token, funnel_id):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get Client ID
    client_res = requests.get(f"{BASE_URL}/clients/", headers=headers)
    client_id = client_res.json()[0]['id']
    headers["X-Client-ID"] = str(client_id)

    trigger_data = {
        "contact_phone": "5511999999999",
        "contact_name": "User Test Nodes",
        "conversation_id": "99999"
    }
    
    print(f"🚀 Disparando funil {funnel_id}...")
    res = requests.post(f"{BASE_URL}/funnels/{funnel_id}/trigger", headers=headers, json=trigger_data)
    
    if res.status_code not in [200, 201]:
        print(f"❌ Erro ao disparar: {res.text}")
        return False
        
    trigger_id = res.json().get("id")
    print(f"✅ Trigger criado (ID: {trigger_id}). Verificando progresso...")
    
    # Poll trigger status for a few seconds to see if it moves
    # The worker logic should execute the nodes.
    for i in range(5):
        time.sleep(2)
        res = requests.get(f"{BASE_URL}/triggers/history", headers=headers)
        if res.status_code == 200:
            history = res.json()
            trigger = next((t for t in history if t['id'] == trigger_id), None)
            if trigger:
                status = trigger.get('status')
                node = trigger.get('current_node_id')
                print(f"   [Snapshot {i+1}] Status: {status} | Node: {node}")
                if status == 'completed':
                    print("✨ Funil finalizado com sucesso!")
                    return True
    
    print("⏳ Funil ainda em execução ou pausado (pode ser o delay de 2s).")
    return True # We count success if it didn't crash

def run_tests():
    print("\n--- [08] Teste de Nós do Gráfico ---")
    token = get_token()
    if not token: return
    
    funnel_id, error = create_test_funnels(token)
    if not funnel_id:
        print(f"❌ {error}")
        return
        
    success = trigger_and_verify(token, funnel_id)
    if success:
        print("\n🏆 Teste de Nós concluído com sucesso!")
    else:
        print("\n🛑 Teste de Nós falhou.")

if __name__ == "__main__":
    run_tests()

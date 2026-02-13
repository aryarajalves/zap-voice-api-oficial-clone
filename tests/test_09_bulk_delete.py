import os
import requests
import json
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")
CLIENT_ID = 1  # Sarah Ferreira

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    print(f"❌ Erro ao obter token: {response.status_code} - {response.text}")
    return None

def test_bulk_delete():
    print("\n--- [09] Teste de Exclusão em Massa (Autenticado) ---")
    
    token = get_token()
    if not token:
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(CLIENT_ID),
        "Content-Type": "application/json"
    }

    # 1. Criar 3 funis para teste
    funnel_ids = []
    print("Criando 3 funis de teste...")
    for i in range(1, 4):
        payload = {
            "name": f"Bulk Test Funnel {i}",
            "description": f"Temporario para teste de exclusao {i}",
            "steps": [{"type": "message", "content": f"Oi {i}"}]
        }
        res = requests.post(f"{BASE_URL}/funnels", headers=headers, json=payload)
        if res.status_code == 200:
            f_id = res.json()["id"]
            funnel_ids.append(f_id)
            print(f"OK: Funil {i} criado (ID: {f_id})")
        else:
            print(f"ERRO ao criar funil {i}: {res.status_code} - {res.text}")
            return

    # 2. Listar funis
    res = requests.get(f"{BASE_URL}/funnels", headers=headers)
    all_funnels = res.json()
    all_ids = [f["id"] for f in all_funnels]
    print(f"Total de funis no sistema: {len(all_ids)}")

    # 3. Excluir os 2 primeiros (Bulk Delete)
    ids_to_delete = funnel_ids[:2]
    print(f"Excluindo em massa IDs: {ids_to_delete}...")
    
    res = requests.delete(f"{BASE_URL}/funnels/bulk", headers=headers, json={"funnel_ids": ids_to_delete})
    
    if res.status_code == 200:
        data = res.json()
        print(f"OK: Resposta do servidor: {data['message']}")
        if data["deleted_count"] != 2:
            print(f"ERRO: Contagem de excluidos incorreta! Esperava 2, obteve {data['deleted_count']}")
            return
    else:
        print(f"ERRO na requisicao bulk delete: {res.status_code} - {res.text}")
        return

    # 4. Verificar listagem novamente
    res = requests.get(f"{BASE_URL}/funnels", headers=headers)
    all_funnels_after = res.json()
    all_ids_after = [f["id"] for f in all_funnels_after]
    
    print(f"Total de funis apos exclusao: {len(all_ids_after)}")
    
    for f_id in ids_to_delete:
        if f_id in all_ids_after:
            print(f"ERRO: Funil {f_id} ainda existe apos exclusao!")
            return
    
    if funnel_ids[2] not in all_ids_after:
        print(f"ERRO: Funil {funnel_ids[2]} desapareceu!")
        return
    
    print(f"OK: Verificacao bem sucedida: {ids_to_delete} sumiram, {funnel_ids[2]} ficou.")

    # 5. Testar "Selecionar Todos" e deletar (deve sobrar zero funis criados por este teste)
    print("\nTestando 'Selecionar Todos'...")
    res = requests.get(f"{BASE_URL}/funnels", headers=headers)
    current_ids = [f["id"] for f in res.json()]
    print(f"Deletando TODOS os {len(current_ids)} funis encontrados...")
    
    res = requests.delete(f"{BASE_URL}/funnels/bulk", headers=headers, json={"funnel_ids": current_ids})
    if res.status_code == 200:
        print(f"OK: Sucesso: {res.json()['message']}")
    else:
        print(f"ERRO ao deletar todos: {res.text}")
        return

    # Verificacao Final
    res = requests.get(f"{BASE_URL}/funnels", headers=headers)
    final_funnels = res.json()
    print(f"Total de funis apos 'Delete All': {len(final_funnels)}")
    if len(final_funnels) == 0:
        print("OK: Sistema limpo com sucesso!")
    else:
        print(f"Atencao: Sobraram {len(final_funnels)} funis (podem ser de outros clientes ou pre-existentes).")

    print("\nTeste de Exclusao em Massa e 'Select All' concluido com sucesso!")

if __name__ == "__main__":
    test_bulk_delete()

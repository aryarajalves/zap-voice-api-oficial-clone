import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")
INSTAGRAM_VERIFY_TOKEN = os.getenv("INSTAGRAM_VERIFY_TOKEN", "zapvoice_instagram_token")


def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    return response.json().get("access_token")


def get_client_id(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    if response.status_code == 200 and response.json():
        return response.json()[0]["id"]
    return None


# ─────────────────────────────────────────────
# TESTE 1: Verificação do Webhook do Meta (GET)
# ─────────────────────────────────────────────
def test_webhook_verification():
    """Testa se o endpoint GET /instagram/webhook responde corretamente ao desafio do Meta."""
    params = {
        "hub.mode": "subscribe",
        "hub.verify_token": INSTAGRAM_VERIFY_TOKEN,
        "hub.challenge": "test_challenge_12345"
    }
    try:
        response = requests.get(f"{BASE_URL}/instagram/webhook", params=params)
        if response.status_code == 200 and response.text.strip() == "test_challenge_12345":
            print("✅ Webhook Instagram - Verificação pelo Meta OK")
            return True, "✅ Webhook Instagram - Verificação pelo Meta OK"
        else:
            msg = f"❌ Webhook Instagram - Status inesperado: {response.status_code} | Body: {response.text[:100]}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Webhook Instagram - Erro de conexão: {e}"


def test_webhook_verification_wrong_token():
    """Testa se o webhook rejeita um verify_token incorreto."""
    params = {
        "hub.mode": "subscribe",
        "hub.verify_token": "token_errado_qualquer",
        "hub.challenge": "12345"
    }
    try:
        response = requests.get(f"{BASE_URL}/instagram/webhook", params=params)
        if response.status_code == 403:
            print("✅ Webhook Instagram - Rejeição de token inválido OK")
            return True, "✅ Webhook Instagram - Rejeição de token inválido OK"
        else:
            msg = f"❌ Webhook Instagram - Deveria retornar 403, recebeu: {response.status_code}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Webhook Instagram - Erro de conexão: {e}"


# ─────────────────────────────────────────────
# TESTE 2: CRUD de Automações do Instagram
# ─────────────────────────────────────────────
def test_create_instagram_automation(token, client_id):
    """Testa a criação de uma nova regra de automação do Instagram."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    payload = {
        "name": "Automação de Teste - Desconto",
        "post_id": "1234567,7654321",
        "trigger_type": "keyword",
        "keywords": "quero, desconto, cupom",
        "action_type": "both",
        "reply_comments": ["Olá! Veja seu DM 😊", "Oi! Confira sua caixa de mensagens!"],
        "funnel_id": None,
        "is_active": True
    }
    try:
        response = requests.post(f"{BASE_URL}/instagram/automations", headers=headers, json=payload)
        if response.status_code in (200, 201):
            automation_id = response.json().get("id")
            print(f"✅ Instagram - Criação de automação OK (ID: {automation_id})")
            return True, "✅ Instagram - Criação OK", automation_id
        else:
            msg = f"❌ Instagram - Erro ao criar: {response.status_code} | {response.text[:200]}"
            print(msg)
            return False, msg, None
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão: {e}", None


def test_list_instagram_automations(token, client_id):
    """Testa a listagem de automações do Instagram."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id)
    }
    try:
        response = requests.get(f"{BASE_URL}/instagram/automations", headers=headers)
        if response.status_code == 200 and isinstance(response.json(), list):
            count = len(response.json())
            print(f"✅ Instagram - Listagem OK ({count} automação(ões) encontrada(s))")
            return True, f"✅ Instagram - Listagem OK ({count} item(s))"
        else:
            msg = f"❌ Instagram - Erro na listagem: {response.status_code}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão: {e}"


def test_update_instagram_automation(token, client_id, automation_id):
    """Testa a atualização de uma automação existente."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    payload = {
        "name": "Automação de Teste - Atualizada",
        "post_id": "all",
        "trigger_type": "any_comment",
        "keywords": None,
        "action_type": "reply_comment",
        "reply_comments": ["Obrigado pelo seu comentário!"],
        "funnel_id": None,
        "is_active": False
    }
    try:
        response = requests.put(f"{BASE_URL}/instagram/automations/{automation_id}", headers=headers, json=payload)
        if response.status_code == 200:
            data = response.json()
            assert data.get("name") == "Automação de Teste - Atualizada", "Nome não foi atualizado"
            assert data.get("is_active") == False, "is_active não foi atualizado"
            print(f"✅ Instagram - Atualização de automação OK (ID: {automation_id})")
            return True, "✅ Instagram - Atualização OK"
        else:
            msg = f"❌ Instagram - Erro ao atualizar: {response.status_code} | {response.text[:200]}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão: {e}"


def test_delete_instagram_automation(token, client_id, automation_id):
    """Testa a exclusão de uma automação."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id)
    }
    try:
        response = requests.delete(f"{BASE_URL}/instagram/automations/{automation_id}", headers=headers)
        if response.status_code == 200:
            print(f"✅ Instagram - Exclusão de automação OK (ID: {automation_id})")
            return True, "✅ Instagram - Exclusão OK"
        else:
            msg = f"❌ Instagram - Erro ao excluir: {response.status_code}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão: {e}"


def test_delete_not_found(token, client_id):
    """Testa que deletar uma automação inexistente retorna 404."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id)
    }
    try:
        response = requests.delete(f"{BASE_URL}/instagram/automations/999999999", headers=headers)
        if response.status_code == 404:
            print("✅ Instagram - Deleção de ID inexistente retorna 404 OK")
            return True, "✅ Instagram - 404 em ID inexistente OK"
        else:
            msg = f"❌ Instagram - Deveria retornar 404, recebeu: {response.status_code}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão: {e}"


def test_create_invalid_no_keywords(token, client_id):
    """Testa que criar uma automação do tipo keyword sem palavras-chave falha com 400."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    payload = {
        "name": "Inválida - Sem Keywords",
        "post_id": "all",
        "trigger_type": "keyword",
        "keywords": None,  # Inválido: trigger_type=keyword sem keywords
        "action_type": "reply_comment",
        "reply_comments": ["resposta teste"],
        "is_active": True
    }
    try:
        response = requests.post(f"{BASE_URL}/instagram/automations", headers=headers, json=payload)
        if response.status_code == 400:
            print("✅ Instagram - Validação: keyword sem keywords retorna 400 OK")
            return True, "✅ Instagram - Validação de payload inválido OK"
        else:
            msg = f"❌ Instagram - Deveria retornar 400, recebeu: {response.status_code}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão: {e}"


def test_scope_isolation(token):
    """Testa que automações de um cliente não aparecem para outro cliente."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/clients/", headers=headers)
    if response.status_code != 200 or len(response.json()) < 2:
        print("ℹ️ Instagram - Teste de isolamento ignorado (não há 2 clientes)")
        return True, "ℹ️ Instagram - Isolamento ignorado (apenas 1 cliente disponível)"

    clients = response.json()
    client_id_a = clients[0]["id"]
    client_id_b = clients[1]["id"]

    # Criar automação no client A
    headers_a = {**headers, "X-Client-ID": str(client_id_a), "Content-Type": "application/json"}
    payload = {
        "name": "Automação Cliente A",
        "post_id": "all",
        "trigger_type": "any_comment",
        "action_type": "reply_comment",
        "reply_comments": ["Resposta A"],
        "is_active": True
    }
    res_create = requests.post(f"{BASE_URL}/instagram/automations", headers=headers_a, json=payload)
    if res_create.status_code not in (200, 201):
        return False, f"❌ Instagram - Isolamento: Falha ao criar automação no cliente A: {res_create.status_code}"

    automation_a_id = res_create.json()["id"]

    # Listar automações no client B
    headers_b = {**headers, "X-Client-ID": str(client_id_b)}
    res_list_b = requests.get(f"{BASE_URL}/instagram/automations", headers=headers_b)
    automations_b = res_list_b.json() if res_list_b.status_code == 200 else []

    # Verificar que a automação do cliente A não aparece para o cliente B
    ids_b = [a["id"] for a in automations_b]
    isolation_ok = automation_a_id not in ids_b

    # Cleanup
    requests.delete(f"{BASE_URL}/instagram/automations/{automation_a_id}", headers=headers_a)

    if isolation_ok:
        print("✅ Instagram - Isolamento entre clientes OK")
        return True, "✅ Instagram - Isolamento de escopo por client_id OK"
    else:
        return False, "❌ Instagram - Automação do cliente A vazou para o cliente B!"


# ─────────────────────────────────────────────
# TESTE 3: Webhook POST - Recebe evento sem erros
# ─────────────────────────────────────────────
def test_webhook_post_receives_event():
    """Testa se o endpoint POST /instagram/webhook aceita payloads sem erros."""
    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "000000000000000",
                "changes": [
                    {
                        "field": "comments",
                        "value": {
                            "id": "comment_test_id_001",
                            "text": "quero desconto",
                            "from": {"id": "999999999", "username": "test_user"},
                            "post": {"id": "post_test_id_001"}
                        }
                    }
                ]
            }
        ]
    }
    try:
        response = requests.post(f"{BASE_URL}/instagram/webhook", json=payload)
        if response.status_code == 200 and response.json().get("status") == "event_received":
            print("✅ Instagram - Webhook POST aceita eventos corretamente OK")
            return True, "✅ Instagram - Webhook POST OK"
        else:
            msg = f"❌ Instagram - Webhook POST status inesperado: {response.status_code}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão no Webhook POST: {e}"


# ─────────────────────────────────────────────
# TESTE 4: Salvar configurações do Instagram via /settings/
# Cobre o bug de "Method Not Allowed" causado por URL sem barra final
# ─────────────────────────────────────────────
def test_save_instagram_settings(token, client_id):
    """Testa que POST /settings/ com chaves INSTAGRAM_* funciona corretamente (sem Method Not Allowed)."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    payload = {
        "settings": {
            "INSTAGRAM_ACCOUNT_ID": "17841400000000000",
            "INSTAGRAM_ACCESS_TOKEN": "EAATestTokenParaTeste123456789"
        }
    }
    try:
        # Deve usar /settings/ com barra final — sem ela o FastAPI faz redirect 307
        # que converte POST em GET, resultando em "Method Not Allowed"
        response = requests.post(f"{BASE_URL}/settings/", headers=headers, json=payload)
        if response.status_code == 200:
            print("✅ Instagram - Salvar configurações via POST /settings/ OK (sem Method Not Allowed)")
            return True, "✅ Instagram - Salvar configurações do Instagram OK"
        else:
            msg = f"❌ Instagram - Erro ao salvar configurações: {response.status_code} | {response.text[:200]}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro de conexão ao salvar configurações: {e}"


# ─────────────────────────────────────────────
# Runner Principal
# ─────────────────────────────────────────────
def test_get_instagram_posts(token, client_id):
    """Testa que GET /instagram/posts retorna 400 (se não configurado) ou 200 (se configurado)."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id)
    }
    try:
        response = requests.get(f"{BASE_URL}/instagram/posts", headers=headers)
        if response.status_code in (200, 400):
            print(f"✅ Instagram - Endpoint de posts respondeu com status esperado: {response.status_code}")
            return True, f"✅ Instagram - Endpoint de posts OK (Status {response.status_code})"
        else:
            msg = f"❌ Instagram - Endpoint de posts retornou status inesperado: {response.status_code} | {response.text[:200]}"
            print(msg)
            return False, msg
    except Exception as e:
        return False, f"❌ Instagram - Erro ao testar obtenção de posts: {e}"


def run_instagram_tests():
    print("\n--- [18] Testes de Automação de Comentários no Instagram ---")
    token = get_token()
    if not token:
        print("❌ Instagram - Não foi possível obter token de autenticação")
        import sys
        sys.exit(1)

    client_id = get_client_id(token)
    if not client_id:
        print("❌ Instagram - Nenhum cliente disponível para executar os testes")
        import sys
        sys.exit(1)

    print(f"[INFO] Usando cliente ID: {client_id}")

    # Resultados com 2 valores (sem automation_id)
    results_static = [
        test_webhook_verification(),
        test_webhook_verification_wrong_token(),
        test_webhook_post_receives_event(),
        test_save_instagram_settings(token, client_id),
        test_list_instagram_automations(token, client_id),
        test_delete_not_found(token, client_id),
        test_create_invalid_no_keywords(token, client_id),
        test_scope_isolation(token),
        test_get_instagram_posts(token, client_id),
    ]

    # Teste CRUD encadeado
    success_create, msg_create, automation_id = test_create_instagram_automation(token, client_id)
    results_crud = [(success_create, msg_create)]

    if success_create and automation_id:
        results_crud.append(test_update_instagram_automation(token, client_id, automation_id))
        results_crud.append(test_delete_instagram_automation(token, client_id, automation_id))
    else:
        results_crud.append((False, "❌ Instagram - Testes de update/delete ignorados pois criação falhou"))

    all_results = results_static + results_crud
    all_success = True
    for success, msg in all_results:
        if not success:
            all_success = False

    print(f"\n{'='*50}")
    total = len(all_results)
    passed = sum(1 for s, _ in all_results if s)
    print(f"[18] Instagram Automation: {passed}/{total} testes passaram.")
    print(f"{'='*50}")

    if not all_success:
        import sys
        sys.exit(1)


if __name__ == "__main__":
    run_instagram_tests()

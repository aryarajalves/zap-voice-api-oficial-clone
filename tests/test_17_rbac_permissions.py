import os
import requests
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_super_admin_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data, timeout=10)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def login_user(email, password):
    url = f"{BASE_URL}/auth/token"
    data = {"username": email, "password": password}
    response = requests.post(url, data=data, timeout=10)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def run_rbac_tests():
    print("\n--- [17] Testes de Permissao de Acesso por Cargo (RBAC) ---")

    # 1. Login como Super Admin
    sa_token = get_super_admin_token()
    if not sa_token:
        print("❌ Falha: Nao foi possivel obter o token do Super Admin")
        exit(1)
    
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # 2. Obter Cliente de teste
    res_clients = requests.get(f"{BASE_URL}/clients/", headers=sa_headers, timeout=10)
    if res_clients.status_code != 200:
        print(f"❌ Falha: Nao foi possivel obter os clientes: {res_clients.status_code}")
        exit(1)
    
    clients = res_clients.json()
    if not clients:
        print("❌ Falha: Nenhum cliente cadastrado no sistema")
        exit(1)
    
    client_id = clients[0]['id']
    print(f"Usando Cliente ID: {client_id} para os testes de RBAC")

    # 3. Criar os usuarios de teste
    users_to_create = [
        {"email": "rbac_admin@example.com", "password": "password123", "full_name": "Test RBAC Admin", "role": "admin"},
        {"email": "rbac_premium@example.com", "password": "password123", "full_name": "Test RBAC Premium", "role": "premium"},
        {"email": "rbac_user@example.com", "password": "password123", "full_name": "Test RBAC User", "role": "user"}
    ]

    created_users = []

    for u in users_to_create:
        # Primeiro, tentar deletar se ja existir de execucoes anteriores que quebraram
        # Listar usuarios para ver se existe
        res_list = requests.get(f"{BASE_URL}/auth/users", headers=sa_headers, timeout=10)
        if res_list.status_code == 200:
            existing = [x for x in res_list.json() if x['email'] == u['email']]
            if existing:
                requests.delete(f"{BASE_URL}/auth/users/{existing[0]['id']}", headers=sa_headers, timeout=10)

        # Criar
        payload = {
            "email": u["email"],
            "password": u["password"],
            "full_name": u["full_name"],
            "role": u["role"],
            "client_ids": [client_id]
        }
        res_create = requests.post(f"{BASE_URL}/auth/register", headers=sa_headers, json=payload, timeout=10)
        if res_create.status_code == 200:
            created_users.append({"email": u["email"], "user_id": res_create.json()["user_id"]})
            print(f"Usuario criado: {u['email']} (Cargo: {u['role']})")
        else:
            print(f"❌ Falha: Erro ao criar usuario {u['email']}: {res_create.status_code} - {res_create.text}")
            exit(1)

    # 4. Obter tokens de cada usuario
    tokens = {}
    for u in users_to_create:
        tk = login_user(u["email"], u["password"])
        if not tk:
            print(f"❌ Falha: Nao foi possivel fazer login com {u['email']}")
            exit(1)
        tokens[u["role"]] = tk

    # Headers para chamadas dos usuarios
    headers = {
        role: {
            "Authorization": f"Bearer {token}",
            "X-Client-ID": str(client_id),
            "Content-Type": "application/json"
        }
        for role, token in tokens.items()
    }

    test_failed = False

    # ------------------ TESTE DE USURIO COMUM (role = user) ------------------
    print("\n--- Testando Restricoes para o cargo 'user' ---")
    h_user = headers["user"]

    # 5.1 Tentar Criar Funil (Esperado: 403)
    res = requests.post(f"{BASE_URL}/funnels", headers=h_user, json={"name": "Funil Teste RBAC", "steps": []}, timeout=10)
    if res.status_code == 403:
        print("✅ user: Criar funil bloqueado (403)")
    else:
        print(f"❌ user: Criar funil deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 5.2 Tentar Criar Agendamento (Esperado: 403)
    res = requests.post(f"{BASE_URL}/schedules/recurring", headers=h_user, json={"frequency": "daily", "scheduled_time": "20:00", "funnel_id": 1}, timeout=10)
    if res.status_code == 403:
        print("✅ user: Criar agendamento bloqueado (403)")
    else:
        print(f"❌ user: Criar agendamento deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 5.3 Tentar Criar Template WhatsApp (Esperado: 403)
    res = requests.post(f"{BASE_URL}/whatsapp/templates", headers=h_user, json={"name": "test_temp", "language": "pt_BR"}, timeout=10)
    if res.status_code == 403:
        print("✅ user: Criar template whatsapp bloqueado (403)")
    else:
        print(f"❌ user: Criar template whatsapp deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 5.4 Tentar Bloquear Contato (Esperado: 403)
    res = requests.post(f"{BASE_URL}/blocked/", headers=h_user, json={"phone": "5511999999999"}, timeout=10)
    if res.status_code == 403:
        print("✅ user: Bloquear contato bloqueado (403)")
    else:
        print(f"❌ user: Bloquear contato deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 5.5 Tentar Criar Lead (Esperado: 403)
    res = requests.post(f"{BASE_URL}/leads", headers=h_user, json={"phone": "5511999999999", "name": "Lead Teste"}, timeout=10)
    if res.status_code == 403:
        print("✅ user: Criar lead bloqueado (403)")
    else:
        print(f"❌ user: Criar lead deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 5.6 Tentar Salvar Configuracao (Esperado: 403)
    res = requests.post(f"{BASE_URL}/settings/", headers=h_user, json={"settings": {}}, timeout=10)
    if res.status_code == 403:
        print("✅ user: Salvar configuracao bloqueado (403)")
    else:
        print(f"❌ user: Salvar configuracao deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 5.7 Testar Leituras (Esperado: 200)
    res = requests.get(f"{BASE_URL}/funnels", headers=h_user, timeout=10)
    if res.status_code == 200:
        print("✅ user: Ler funis permitido (200)")
    else:
        print(f"❌ user: Ler funis falhou: {res.status_code}")
        test_failed = True

    res = requests.get(f"{BASE_URL}/schedules/?start=2026-05-22T00:00:00Z&end=2026-05-22T23:59:59Z", headers=h_user, timeout=10)
    if res.status_code == 200:
        print("✅ user: Ler agenda permitido (200)")
    else:
        print(f"❌ user: Ler agenda falhou: {res.status_code}")
        test_failed = True

    res = requests.get(f"{BASE_URL}/whatsapp/templates", headers=h_user, timeout=10)
    if res.status_code == 200:
        print("✅ user: Ler templates whatsapp permitido (200)")
    else:
        print(f"❌ user: Ler templates whatsapp falhou: {res.status_code}")
        test_failed = True

    # ------------------ TESTE DE USUARIO PREMIUM (role = premium) ------------------
    print("\n--- Testando Restricoes para o cargo 'premium' ---")
    h_prem = headers["premium"]

    # 6.1 Tentar Salvar Configuracao (Esperado: 403)
    res = requests.post(f"{BASE_URL}/settings/", headers=h_prem, json={"settings": {}}, timeout=10)
    if res.status_code == 403:
        print("✅ premium: Salvar configuracao bloqueado (403)")
    else:
        print(f"❌ premium: Salvar configuracao deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 6.2 Tentar Revelar Chave Sensivel (Esperado: 403)
    res = requests.post(f"{BASE_URL}/settings/reveal", headers=h_prem, json={"key": "WA_ACCESS_TOKEN"}, timeout=10)
    if res.status_code == 403:
        print("✅ premium: Revelar chaves sensiveis bloqueado (403)")
    else:
        print(f"❌ premium: Revelar chaves sensiveis deveria retornar 403, retornou: {res.status_code}")
        test_failed = True

    # 6.3 Testar Acoes Permitidas de Escrita (Esperado: nao 403, ex: 200 ou 400 por validacao)
    # Criar e depois Deletar Funil
    res = requests.post(f"{BASE_URL}/funnels", headers=h_prem, json={"name": "Funil Premium Test", "steps": []}, timeout=10)
    if res.status_code in [200, 201]:
        funnel_id = res.json()["id"]
        print("✅ premium: Criar funil permitido (200)")
        res_del = requests.delete(f"{BASE_URL}/funnels/{funnel_id}", headers=h_prem, timeout=10)
        if res_del.status_code == 200:
            print("✅ premium: Deletar funil permitido (200)")
        else:
            print(f"❌ premium: Deletar funil falhou: {res_del.status_code}")
            test_failed = True
    elif res.status_code == 400 and "já existe" in res.text.lower():
        print("✅ premium: Criar funil permitido (200 - ja existia)")
    else:
        print(f"❌ premium: Criar funil bloqueado indevidamente: {res.status_code} - {res.text}")
        test_failed = True

    # ------------------ TESTE DE ADMINISTRADOR (role = admin) ------------------
    print("\n--- Testando Permissoes para o cargo 'admin' ---")
    h_admin = headers["admin"]

    # 7.1 Revelar Chave Sensivel (Esperado: 200)
    res = requests.post(f"{BASE_URL}/settings/reveal", headers=h_admin, json={"key": "WA_ACCESS_TOKEN"}, timeout=10)
    if res.status_code == 200:
        print("✅ admin: Revelar chave permitido (200)")
    else:
        print(f"❌ admin: Revelar chave falhou: {res.status_code} - {res.text}")
        test_failed = True

    # 7.2 Atualizar Configuracoes (Esperado: 200)
    res = requests.post(f"{BASE_URL}/settings/", headers=h_admin, json={"settings": {"CLIENT_NAME": f"Novo Nome Admin {client_id}"}}, timeout=10)
    if res.status_code == 200:
        print("✅ admin: Salvar configuracao permitido (200)")
    else:
        print(f"❌ admin: Salvar configuracao falhou: {res.status_code} - {res.text}")
        test_failed = True

    # 8. Limpeza de Usuarios de Teste
    print("\n--- Limpando Usuarios de Teste ---")
    for u in created_users:
        res_del = requests.delete(f"{BASE_URL}/auth/users/{u['user_id']}", headers=sa_headers, timeout=10)
        if res_del.status_code in [200, 204]:
            print(f"Usuario removido: {u['email']}")
        else:
            print(f"⚠️ Erro ao remover usuario {u['email']}: {res_del.status_code}")

    if test_failed:
        print("\n❌ ALGUNS TESTES DE RBAC FALHARAM!")
        exit(1)
    else:
        print("\n✅ TODOS OS TESTES DE RBAC PASSARAM!")

if __name__ == "__main__":
    run_rbac_tests()

import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "aryarajmarketing@gmail.com")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "123456")
CLIENT_ID = 1

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    try:
        response = requests.post(url, data=data)
        if response.status_code == 200:
            return response.json().get("access_token")
    except Exception as e:
        print(f"[ERRO] Exceção ao conectar no backend: {e}")
    return None

def test_checkout_presell_flow():
    print("\n--- [22] Teste de Checkout Presell & Página de Captura ---")

    token = get_token()
    assert token is not None, "Falha ao autenticar admin para obter JWT token."

    headers_admin = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(CLIENT_ID)
    }

    # 1. Obter configuração do checkout
    res_get = requests.get(f"{BASE_URL}/checkout-presell/config", headers=headers_admin)
    assert res_get.status_code == 200, f"Falha ao obter config: {res_get.text}"
    config_data = res_get.json()
    print(f"[OK] Configuração atual obtida (Slug: {config_data.get('slug')})")

    # 2. Atualizar a configuração com um slug único de teste
    test_slug = f"test-mentoria-{CLIENT_ID}"
    update_payload = {
        "slug": test_slug,
        "title": "Mentoria Exclusiva de Vendas",
        "description": "Preencha a aplicação para garantir seu desconto especial.",
        "badge_text": "🔥 Vagas Limitadas",
        "destination_url": "https://pay.kiwify.com.br/teste-123",
        "tag_name": "Lead Teste Mentoria",
        "page_tab_title": "Aba Customizada Mentoria VIP",
        "button_text": "Garantir Vaga Agora →"
    }

    res_post = requests.post(f"{BASE_URL}/checkout-presell/config", headers=headers_admin, json=update_payload)
    assert res_post.status_code == 200, f"Falha ao atualizar config: {res_post.text}"
    updated_config = res_post.json()
    assert updated_config["slug"] == test_slug
    assert updated_config["title"] == "Mentoria Exclusiva de Vendas"
    assert updated_config["page_tab_title"] == "Aba Customizada Mentoria VIP"
    print(f"[OK] Configuração atualizada com sucesso para o slug '{test_slug}'!")

    # 3. Teste Endpoint Público - Buscar Config por Slug
    res_pub = requests.get(f"{BASE_URL}/checkout-presell/public/{test_slug}")
    assert res_pub.status_code == 200, f"Falha ao buscar config pública: {res_pub.text}"
    pub_data = res_pub.json()
    assert pub_data["title"] == "Mentoria Exclusiva de Vendas"
    assert pub_data["page_tab_title"] == "Aba Customizada Mentoria VIP"
    print(f"[OK] Endpoint público de busca por slug funcionou corretamente!")

    # 4. Teste Endpoint Público - Enviar Aplicação (Submit Lead)
    lead_payload = {
        "name": "Carlos Tester",
        "email": "carlos.test@exemplo.com",
        "phone": "5511988887777"
    }
    res_submit = requests.post(f"{BASE_URL}/checkout-presell/public/{test_slug}/submit", json=lead_payload)
    assert res_submit.status_code == 200, f"Falha na submissão pública: {res_submit.text}"
    submit_data = res_submit.json()
    assert submit_data["success"] is True
    assert "carlos.test%40exemplo.com" in submit_data["redirect_url"] or "carlos.test@exemplo.com" in submit_data["redirect_url"]
    assert "5511988887777" in submit_data["redirect_url"]
    print(f"[OK] Submissão de lead realizada! Redirecionamento gerado: {submit_data['redirect_url']}")

    # 5. Verificar se o lead aparece na lista do Admin
    res_leads = requests.get(f"{BASE_URL}/checkout-presell/leads?search=Carlos", headers=headers_admin)
    assert res_leads.status_code == 200, f"Falha ao listar leads no admin: {res_leads.text}"
    leads_list = res_leads.json()
    assert leads_list["total"] > 0
    found_lead = leads_list["items"][0]
    assert found_lead["name"] == "Carlos Tester"
    assert "has_chat" in found_lead
    print(f"[OK] Lead capturado e verificado na tabela do Admin! ID: {found_lead['id']} (has_chat: {found_lead['has_chat']})")

    # 6. Limpar o lead de teste
    res_del = requests.delete(f"{BASE_URL}/checkout-presell/leads/{found_lead['id']}", headers=headers_admin)
    assert res_del.status_code == 200
    print(f"[OK] Lead de teste removido com sucesso!")

    print("\n[SUCCESS] Todos os testes unitarios do Checkout Presell passaram com sucesso!\n")

if __name__ == "__main__":
    test_checkout_presell_flow()

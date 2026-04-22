
import asyncio
import os
import httpx
from dotenv import load_dotenv

# Carrega .env do diretório backend
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

API_URL = os.getenv("CHATWOOT_API_URL")
API_TOKEN = os.getenv("CHATWOOT_API_TOKEN")
ACCOUNT_ID = os.getenv("CHATWOOT_ACCOUNT_ID", "1")

if not API_URL or not API_TOKEN:
    print("❌ Erro: CHATWOOT_API_URL ou CHATWOOT_API_TOKEN não encontrados no .env")
    exit(1)

# Ajuste URL
if "/api/v1" not in API_URL:
    API_URL = f"{API_URL.rstrip('/')}/api/v1"

BASE_URL = f"{API_URL}/accounts/{ACCOUNT_ID}"
headers = {
    "api_access_token": API_TOKEN,
    "Content-Type": "application/json"
}

async def create_test_duplicates():
    async with httpx.AsyncClient(verify=False) as client:
        print(f"🚀 Iniciando script de criação de duplicatas...")
        
        # 1. Buscar as conversas atuais para encontrar um contato (source_id)
        print("🔍 Buscando conversas existentes para identificar um contato...")
        resp = await client.get(f"{BASE_URL}/conversations", headers=headers)
        if resp.status_code != 200:
            print(f"❌ Erro ao buscar conversas: {resp.text}")
            return
        
        data = resp.json()
        payload = data.get("payload", [])
        if not payload:
            print("❌ Nenhuma conversa encontrada na conta para usar como base.")
            return
        
        # Pega a primeira conversa
        base_conv = payload[0]
        contact_id = base_conv.get("meta", {}).get("sender", {}).get("id")
        inbox_id = base_conv.get("inbox_id")
        contact_name = base_conv.get("meta", {}).get("sender", {}).get("name")
        contact_phone = base_conv.get("meta", {}).get("sender", {}).get("phone_number")
        
        if not contact_id:
            print("❌ Não foi possível identificar o ID do contato na conversa base.")
            return

        print(f"✅ Contato Base Identificado: {contact_name} (ID: {contact_id}, Fone: {contact_phone})")
        print(f"📥 Inbox ID: {inbox_id}")
        
        # 2. Criar 2 novas conversas para este mesmo contato
        print(f"\n🛠️ Criando 2 conversas duplicadas (fakes) para este contato...")
        
        for i in range(1, 3):
            create_payload = {
                "source_id": contact_id,
                "inbox_id": inbox_id,
                "status": "open"
            }
            
            post_resp = await client.post(f"{BASE_URL}/conversations", json=create_payload, headers=headers)
            if post_resp.status_code in [200, 201]:
                new_id = post_resp.json().get("id")
                print(f"   ✨ Sucesso! Conversa duplicada #{i} criada com ID: {new_id}")
            else:
                print(f"   ❌ Erro ao criar duplicada #{i}: {post_resp.text}")

        print("\n🏁 Pronto! Agora você pode ir no ZapVoice e clicar em 'Limpar Duplicadas'.")
        print(f"O sistema deve encontrar essas conversas novas e removê-las, mantendo apenas a mais recente.")

if __name__ == "__main__":
    asyncio.run(create_test_duplicates())

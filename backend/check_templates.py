import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Pegar credenciais do ambiente
WA_BUSINESS_ACCOUNT_ID = os.getenv("WA_BUSINESS_ACCOUNT_ID")
WA_ACCESS_TOKEN = os.getenv("WA_ACCESS_TOKEN")

print(f"🔍 Testando credenciais...")
print(f"🆔 Account ID: {WA_BUSINESS_ACCOUNT_ID}")
print(f"🔑 Token (inicio): {WA_ACCESS_TOKEN[:15]}...")

if not WA_BUSINESS_ACCOUNT_ID or not WA_ACCESS_TOKEN:
    print("❌ Erro: Credenciais não encontradas no .env")
    exit(1)

# URL da API Oficial
url = f"https://graph.facebook.com/v19.0/{WA_BUSINESS_ACCOUNT_ID}/message_templates?limit=10"

headers = {
    "Authorization": f"Bearer {WA_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

try:
    print(f"\n📡 Conectando ao Facebook...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        templates = data.get("data", [])
        
        print(f"✅ Sucesso! Encontrados {len(templates)} templates (limitado a 10).")
        print("\n📋 Lista de Templates:")
        print("-" * 50)
        for t in templates:
            print(f"Nome: {t.get('name')} | Status: {t.get('status')} | Lang: {t.get('language')}")
        print("-" * 50)
        
        print("\n🤔 Se esses nomes forem os da Sarah, então o ID da conta pertence a conta da Sarah!")
    else:
        print(f"❌ Erro na API: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"❌ Erro de execução: {e}")

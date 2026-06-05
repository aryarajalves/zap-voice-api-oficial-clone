import sys
import os
import httpx
import asyncio

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models
from config_loader import get_settings

async def debug():
    client_id = 3
    settings = get_settings(client_id)
    api_key = settings.get("MANYCHAT_API_KEY")
    
    print(f"MANYCHAT_API_KEY do cliente 3: {api_key[:10]}***" if api_key else "Chave vazia!")
    if not api_key:
        return
        
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }
    
    phone = "5544999037534"
    email = "teste@gmail.com"
    name = "teste"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Testar criação direta
        create_url = f"https://api.manychat.com/fb/subscriber/createSubscriber"
        create_payload = {
            "first_name": name,
            "whatsapp_phone": phone,
            "has_opt_in_sms": True,
            "consent_phrase": "Consent"
        }
        if email:
            create_payload["email"] = email
            create_payload["has_opt_in_email"] = True
            
        print("\n--- Testando Criar Contato ---")
        resp = await client.post(create_url, json=create_payload, headers=headers)
        print(f"Status criação: {resp.status_code}")
        print(f"Resposta criação: {resp.text}")
        
        # 2. Testar busca por email
        print("\n--- Testando Busca por E-mail (findBySystemField) ---")
        find_email_url = f"https://api.manychat.com/fb/subscriber/findBySystemField?email={email}"
        resp_email = await client.get(find_email_url, headers=headers)
        print(f"Status busca email: {resp_email.status_code}")
        print(f"Resposta busca email: {resp_email.text}")
        
        # 3. Testar busca por phone com variantes
        print("\n--- Testando Busca por Telefone (findBySystemField) com Variantes ---")
        phone_variants = [
            "5544999037534",
            "+5544999037534",
            "554499037534",
            "+554499037534",
            "44999037534",
            "4499037534"
        ]
        for p in phone_variants:
            p_encoded = p.replace("+", "%2B")
            find_phone_url = f"https://api.manychat.com/fb/subscriber/findBySystemField?phone={p_encoded}"
            resp_phone = await client.get(find_phone_url, headers=headers)
            print(f"Status busca para '{p}': {resp_phone.status_code}")
            print(f"Resposta busca para '{p}': {resp_phone.text}")

        # 3.1 Testar whatsapp_phone e whatsapp_id no findBySystemField
        print("\n--- Testando whatsapp_phone e whatsapp_id no findBySystemField ---")
        for field in ["whatsapp_phone", "whatsapp_id", "wa_id"]:
            find_url_f = f"https://api.manychat.com/fb/subscriber/findBySystemField?{field}=5544999037534"
            resp_f = await client.get(find_url_f, headers=headers)
            print(f"Status busca {field}: {resp_f.status_code}")
            print(f"Resposta busca {field}: {resp_f.text}")

        # 4. Testar busca por whatsapp_id
        print("\n--- Testando Busca por WhatsApp ID (getInfoByWhatsAppId) ---")
        find_wa_url = f"https://api.manychat.com/fb/subscriber/getInfoByWhatsAppId?whatsapp_id={phone}"
        resp_wa = await client.get(find_wa_url, headers=headers)
        print(f"Status busca WA: {resp_wa.status_code}")
        print(f"Resposta busca WA: {resp_wa.text}")

        # 5. Testar busca por nome
        print("\n--- Testando Busca por Nome ---")
        find_name_url = f"https://api.manychat.com/fb/subscriber/findByName?name={name}"
        resp_name = await client.get(find_name_url, headers=headers)
        print(f"Status busca nome: {resp_name.status_code}")
        print(f"Resposta busca nome: {resp_name.text[:500]}")

if __name__ == "__main__":
    asyncio.run(debug())

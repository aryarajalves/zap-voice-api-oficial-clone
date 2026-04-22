import json
import requests

payload = {
  "form[id]": "c1d6fde",
  "form[name]": "Checkout pré populado",
  "fields[src][id]": "src",
  "fields[name][id]": "name",
  "fields[email][id]": "email",
  "fields[phone][id]": "phone",
  "fields[src][type]": "hidden",
  "meta[date][title]": "Date",
  "meta[date][value]": "março 30, 2026",
  "meta[time][title]": "Time",
  "meta[time][value]": "1:53 pm",
  "fields[name][type]": "text",
  "fields[src][title]": "src",
  "fields[src][value]": "",
  "fields[email][type]": "email",
  "fields[name][title]": "Seu nome",
  "fields[name][value]": "Teste",
  "fields[phone][type]": "text",
  "meta[credit][title]": "Powered by",
  "meta[credit][value]": "Elementor",
  "fields[email][title]": "Seu melhor email",
  "fields[email][value]": "teste@gmail.com",
  "fields[phone][title]": "Whatsapp",
  "fields[phone][value]": "(85) 98769-6383",
  "fields[utm_term][id]": "utm_term",
  "fields[src][required]": "0",
  "meta[page_url][title]": "Page URL",
  "meta[page_url][value]": "https://tarciramartinsacademy.com.br/pagina-aberta/?fbclid=fbclid",
  "fields[name][required]": "1",
  "fields[src][raw_value]": "",
  "fields[utm_medium][id]": "utm_medium",
  "fields[utm_source][id]": "utm_source",
  "fields[utm_term][type]": "hidden",
  "meta[remote_ip][title]": "Remote IP",
  "meta[remote_ip][value]": "2804:29b8:512a:2767:1cd6:b485:f567:86d9",
  "fields[email][required]": "1",
  "fields[name][raw_value]": "Teste",
  "fields[phone][required]": "1",
  "fields[utm_content][id]": "utm_content",
  "fields[utm_term][title]": "utm_term",
  "fields[utm_term][value]": "",
  "meta[user_agent][title]": "User Agent",
  "meta[user_agent][value]": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
  "fields[email][raw_value]": "teste@gmail.com",
  "fields[phone][raw_value]": "(85) 98769-6383",
  "fields[utm_campaign][id]": "utm_campaign",
  "fields[utm_medium][type]": "hidden",
  "fields[utm_source][type]": "hidden",
  "fields[utm_content][type]": "hidden",
  "fields[utm_medium][title]": "utm_medium",
  "fields[utm_medium][value]": "direto",
  "fields[utm_source][title]": "utm_source",
  "fields[utm_source][value]": "acesso",
  "fields[utm_campaign][type]": "hidden",
  "fields[utm_content][title]": "utm_content",
  "fields[utm_content][value]": "",
  "fields[utm_term][required]": "0",
  "fields[utm_campaign][title]": "utm_campaign",
  "fields[utm_campaign][value]": "organico",
  "fields[utm_term][raw_value]": "",
  "fields[utm_medium][required]": "0",
  "fields[utm_source][required]": "0",
  "fields[utm_content][required]": "0",
  "fields[utm_medium][raw_value]": "direto",
  "fields[utm_source][raw_value]": "acesso",
  "fields[utm_campaign][required]": "0",
  "fields[utm_content][raw_value]": "",
  "fields[utm_campaign][raw_value]": "organico"
}

def mock_parse_webhook_payload(platform, payload):
    # This is a simplified version of the logic in webhooks_public.py
    result = {
        "name": None,
        "phone": None,
        "email": None,
        "platform": platform.lower()
    }
    
    # Simulate the fallback extraction logic
    if not result.get('phone'):
        # Matches line 253 in webhooks_public.py
        result['phone'] = (
            payload.get("phone") or payload.get("phone_number") or 
            payload.get("fields[phone][value]") or payload.get("fields[whatsapp][value]")
        )
    
    if not result.get('name'):
        result['name'] = payload.get("name") or payload.get("fields[name][value]")
        
    if not result.get('email'):
        result['email'] = payload.get("email") or payload.get("fields[email][value]")

    # Simulation of phone cleaning and normalization (lines 459+)
    if result.get("phone"):
        cleaned = ''.join(filter(str.isdigit, str(result["phone"])))
        if not cleaned.startswith("55") and len(cleaned) <= 11:
            cleaned = "55" + cleaned
        result["phone"] = cleaned
        
    return result

print("Testing with Elementor payload...")
parsed = mock_parse_webhook_payload("elementor", payload)
print(f"Extracted Name: {parsed['name']}")
print(f"Extracted Phone: {parsed['phone']}")
print(f"Extracted Email: {parsed['email']}")

if parsed['phone'] == "5585987696383":
    print("SUCCESS: Standard extraction worked for flat payload.")
else:
    print("FAILED: Standard extraction did NOT work for flat payload.")

# Simulation of what might be happening with multipart/form-data or nested keys
payload_nested = {
    "fields": {
        "phone": {"value": "(85) 98769-6383"}
    }
}

# The actual get_val tool uses recursion which was at lines 48-60 in webhooks_public.py
def get_val(payload, keys):
    curr = payload
    for key in keys:
        if isinstance(curr, dict) and key in curr:
            curr = curr[key]
        else:
            return None
    if isinstance(curr, dict) and "value" in curr:
        return curr["value"]
    return curr

# Simulation of nested extraction
phone_nested = get_val(payload_nested, ["fields", "phone"])
print(f"Extracted Nested Phone: {phone_nested}")

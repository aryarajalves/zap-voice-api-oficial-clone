import json

def extract_value_by_path(data: dict, path: str):
    if not path: return None
    paths = [p.strip() for p in path.replace('||', ',').split(',')]
    
    for p in paths:
        if p.startswith("$json."):
            p = p[6:]
        elif p == "$json":
            return data

        keys = p.split('.')
        current = data
        found = True
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                found = False
                break
        
        if found and current is not None:
            return current
    return None

payload = {"data": {"product": {"id": 2938475, "name": "Mastering AI Workflows 2026", "category": "E-learning / Technology", "status": "ACTIVE"}, "purchase": {"transaction": "HP0123456789MW", "order_date": 1738873949, "status": "APPROVED", "payment": {"method": "CREDIT_CARD", "installments": 12, "currency": "BRL", "price": {"total_value": 997.0, "tax_value": 24.5, "net_value": 972.5}}, "checkout_country": "Brazil"}, "buyer": {"email": "user.example@provider.com", "name": "Gabriel Santos", "document": "123.456.789-00", "telefone": "55 85 9612-3586", "address": {"zip_code": "01310-200", "city": "São Paulo", "state": "SP"}}, "commissions": [{"role": "PRODUCER", "user_id": 887766, "value": 750.0}, {"role": "AFFILIATE", "user_id": 443322, "value": 150.0}, {"role": "PLATFORM", "user_id": 1, "value": 72.5}], "tracking": {"utm_source": "instagram_ads", "utm_medium": "stories", "utm_campaign": "launch_feb_26", "hotcheckout_id": "hck_0987654321"}}, "version": "2.0.1"}

path = "data.buyer.nam"
result = extract_value_by_path(payload, path)
print(f"Path: '{path}'")
print(f"Result: '{result}'")

path2 = "data.product.name"
result2 = extract_value_by_path(payload, path2)
print(f"Path: '{path2}'")
print(f"Result: '{result2}'")

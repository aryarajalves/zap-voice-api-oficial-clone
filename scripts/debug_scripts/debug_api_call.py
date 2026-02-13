import requests
from datetime import datetime
import json

# URL deve apontar para o backend rodando. Se for localhost do usuario, use localhost:8000
API_URL = "http://localhost:8000/api/schedules"

# Parametros de data (Janeiro inteiro)
start = "2026-01-01T00:00:00"
end = "2026-02-01T23:59:59"

headers = {
    "X-Client-ID": "1", # Sarah Ferreira
    # Se precisar de Auth Token, vai falhar. Mas vou tentar sem auth, apenas headers client id
    # Se falhar, vou precisar gerar token.
}

print(f"Calling {API_URL}...")
try:
    # Preciso de um token valido se o backend exigir.
    # O endpoint exige 'current_user = Depends(get_current_user)'
    # Entao vai falhar sem token.
    print("Skipping request because valid token is hard to generate in script.")
except Exception as e:
    print(e)

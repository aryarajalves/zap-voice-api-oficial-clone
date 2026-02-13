import os
import requests
import json
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Carrega variaveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_window_24h_logic():
    print("\n--- [12] Teste de Validação de Janela 24h ---")
    
    token = get_token()
    if not token:
        print("Erro ao obter token")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Número do usuário (usando o do exemplo)
    test_phone = "558596123586"

    print(f"Validando janela de 24h para o número: {test_phone}")
    
    payload = {
        "contacts": [test_phone]
    }

    try:
        res = requests.post(f"{BASE_URL}/chatwoot/validate_contacts", headers=headers, json=payload)
        if res.status_code == 200:
            results = res.json()
            if results:
                data = results[0]
                exists = data.get("exists")
                window_open = data.get("window_open")
                last_activity = data.get("last_activity")
                
                print(f"  - Contato existe? {'Sim' if exists else 'Nao'}")
                print(f"  - Janela aberta? {'SIM (Pode enviar)' if window_open else 'NAO (Precisa de Template)'}")
                
                if last_activity:
                    # Converte para legivel se for timestamp
                    if isinstance(last_activity, (int, float)):
                        dt = datetime.fromtimestamp(last_activity, tz=timezone.utc)
                        print(f"  - Ultima atividade: {dt.strftime('%d/%m/%Y %H:%M:%S UTC')}")
                    else:
                        print(f"  - Ultima atividade (raw): {last_activity}")
                else:
                    print("  - Nenhuma atividade registrada para este contato.")
                
                # Validacao de consistencia: se window_open for True, last_activity deve ser < 24h
                if window_open and last_activity:
                     # Check if it makes sense
                     if isinstance(last_activity, (int, float)):
                         now_ts = datetime.now(timezone.utc).timestamp()
                         if (now_ts - last_activity) < 24 * 3600:
                             print("✅ Logica de Tempo: CONSISTENTE (Atividade recente)")
                         else:
                             print("❌ Logica de Tempo: INCONSISTENTE (Aberta mas atividade antiga)")
                
                if exists and not window_open:
                    print("ℹ️ Nota: O contato existe mas a janela esta fechada.")
            else:
                print("❌ Falha: Lista de resultados vazia.")
        else:
            print(f"❌ Erro na API: {res.status_code} - {res.text}")

    except Exception as e:
        print(f"❌ Erro de execucao: {e}")

if __name__ == "__main__":
    test_window_24h_logic()

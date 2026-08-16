import os
import requests
import json
import time
from datetime import datetime, timedelta, timezone
import zoneinfo
from dotenv import load_dotenv
import sys

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"))

if os.environ.get("DATABASE_URL") and "zapvoice-postgres" in os.environ["DATABASE_URL"]:
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("zapvoice-postgres", "localhost").replace(":5432", ":5435")

BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

def get_token():
    url = f"{BASE_URL}/auth/token"
    data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(url, data=data)
    if response.status_code != 200:
        print(f"❌ Falha ao obter token: {response.text}")
        return None
    return response.json().get("access_token")

def test_funnel_keyword_trigger():
    print("🚀 [TEST 38] Iniciando teste de Funil com Gatilho por Palavra-Chave e Trava Anti-Repetição...")
    token = get_token()
    assert token, "Token não obtido"

    headers = {"Authorization": f"Bearer {token}"}
    client_res = requests.get(f"{BASE_URL}/clients/", headers=headers)
    assert client_res.status_code == 200
    clients_list = client_res.json()
    active_client = next((c for c in clients_list if c.get('is_active')), clients_list[0])
    client_id = active_client['id']
    headers["X-Client-ID"] = str(client_id)

    # 1. Criar Funil com Palavra-Chave e Trava Diária
    unique_keyword = f"TESTEKW{int(time.time())}"
    funnel_payload = {
        "name": f"Funil Palavra Chave {unique_keyword}",
        "description": "Funil para testar ativacao por palavra chave",
        "trigger_phrase": f"{unique_keyword}, AULAVIP",
        "trigger_match_type": "contains",
        "trigger_limit_type": "once_per_day",
        "is_trigger_active": True,
        "steps": {
            "nodes": [
                {
                    "id": "msg_start",
                    "type": "messageNode",
                    "position": {"x": 100, "y": 100},
                    "data": {"content": "Olá! Seu cadastro na aula foi confirmado!", "isStart": True}
                }
            ],
            "edges": []
        }
    }

    res_create = requests.post(f"{BASE_URL}/funnels", headers=headers, json=funnel_payload)
    assert res_create.status_code in [200, 201], f"Erro ao criar funil: {res_create.text}"
    funnel = res_create.json()
    funnel_id = funnel["id"]
    print(f"✅ Funil criado com sucesso (ID: {funnel_id}) com Palavra-Chave '{unique_keyword}' e Limite 'once_per_day'")

    # 2. Validar se os campos foram salvos corretamente
    assert funnel.get("trigger_phrase") == f"{unique_keyword}, AULAVIP"
    assert funnel.get("trigger_match_type") == "contains"
    assert funnel.get("trigger_limit_type") == "once_per_day"
    assert funnel.get("is_trigger_active") is True

    # 3. Atualizar o Funil para modo correspondência exata e limite 24h
    funnel_payload["trigger_match_type"] = "exact"
    funnel_payload["trigger_limit_type"] = "once_24h"
    res_update = requests.put(f"{BASE_URL}/funnels/{funnel_id}", headers=headers, json=funnel_payload)
    assert res_update.status_code == 200, f"Erro ao atualizar funil: {res_update.text}"
    updated = res_update.json()
    assert updated.get("trigger_match_type") == "exact"
    assert updated.get("trigger_limit_type") == "once_24h"
    print(f"✅ Funil atualizado com sucesso para match_type='exact' e limit_type='once_24h'")

    # 4. Testar a lógica de verificação direta no banco
    from database import SessionLocal
    import models
    from core.worker.handlers.whatsapp_inbound import handle_whatsapp_inbound_messages

    db = SessionLocal()
    try:
        client_obj = db.query(models.Client).filter(models.Client.id == client_id).first()
        if client_obj:
            client_obj.is_active = True
            db.commit()

        phone_number_id = f"phone_id_{client_id}"
        app_conf = db.query(models.AppConfig).filter(
            models.AppConfig.client_id == client_id,
            models.AppConfig.key == "WA_PHONE_NUMBER_ID"
        ).first()

        if not app_conf:
            app_conf = models.AppConfig(client_id=client_id, key="WA_PHONE_NUMBER_ID", value=phone_number_id)
            db.add(app_conf)
            db.commit()
        else:
            phone_number_id = app_conf.value or phone_number_id

        test_phone = f"55119{int(time.time()) % 100000000:08d}"
        
        # Simular mensagem de entrada com a palavra-chave exata
        mock_messages = [
            {
                "from": test_phone,
                "id": f"wamid.test_{int(time.time())}",
                "type": "text",
                "text": {"body": unique_keyword}
            }
        ]
        mock_value = {"contacts": [{"wa_id": test_phone, "profile": {"name": "Test User"}}]}
        mock_metadata = {"phone_number_id": phone_number_id}

        import asyncio
        from unittest.mock import AsyncMock, patch
        
        with patch('core.worker.handlers.whatsapp.rabbitmq.publish', new_callable=AsyncMock) as mock_pub:
            asyncio.run(handle_whatsapp_inbound_messages(db, mock_messages, mock_value, mock_metadata))

        # Verificar se o trigger foi criado
        trigger_1 = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.funnel_id == funnel_id,
            models.ScheduledTrigger.contact_phone == test_phone
        ).first()

        assert trigger_1 is not None, "Trigger não foi criado após o primeiro envio da palavra-chave!"
        print(f"✅ Primeiro disparo por palavra-chave criado com sucesso! (Trigger ID: {trigger_1.id})")

        # Simular segundo envio da mesma palavra-chave pelo mesmo contato (deve ser bloqueado pela trava de 24h)
        mock_messages_2 = [
            {
                "from": test_phone,
                "id": f"wamid.test_{int(time.time()) + 1}",
                "type": "text",
                "text": {"body": unique_keyword}
            }
        ]
        with patch('core.worker.handlers.whatsapp.rabbitmq.publish', new_callable=AsyncMock) as mock_pub2:
            asyncio.run(handle_whatsapp_inbound_messages(db, mock_messages_2, mock_value, mock_metadata))

        count_triggers = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.funnel_id == funnel_id,
            models.ScheduledTrigger.contact_phone == test_phone
        ).count()

        assert count_triggers == 1, f"Trava anti-repetição falhou! Quantidade de triggers encontrados: {count_triggers} (esperado: 1)"
        print(f"✅ Trava de repetição validada com sucesso! O segundo envio no mesmo período foi bloqueado.")

    finally:
        db.close()

    print("🎉 [TEST 38] Teste de Gatilho por Palavra-Chave e Trava Anti-Repetição concluído com 100% de SUCESSO!")

if __name__ == "__main__":
    test_funnel_keyword_trigger()


import sys
import os

# Override DB for local test execution (assuming port 5432 exposed)
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/zapvoice"
# Override RabbitMQ host too if needed
os.environ["RABBITMQ_HOST"] = "localhost"

# Adicionar o diretório pai ao path para importar backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from datetime import datetime, timezone

client = TestClient(app)

def get_auth_headers():
    # Simula um usuário autenticado ou usa credenciais reais se necessário
    # Aqui vamos tentar fazer mockup da dependencia se for complicado, 
    # mas se o sistema exige token validado no banco, precisamos de um user real.
    # Vamos assumir que conseguimos override ou usar um user existente no banco de teste.
    
    # Para simplificar, vamos fazer override da dependencia get_current_user
    from core.deps import get_current_user
    
    def mock_get_current_user():
        db = SessionLocal()
        user = db.query(models.User).filter(models.User.email == "admin@zapvoice.com").first()
        if not user:
            # Create dummy user if not exists for test
            user = models.User(email="admin@zapvoice.com", full_name="Admin Test", role="super_admin", client_id=1)
            # Nota: em sistema real precisaria persisitir se nao existir, mas assumimos que existe ou mockamos o obj
        db.close()
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    return {
        "X-Client-ID": "1",
        "Content-Type": "application/json"
    }

def test_single_dispatch():
    print("\n[TEST] Iniciando Teste de Disparo Único...")
    headers = get_auth_headers()
    
    payload = {
        "template_name": "teste_single_v1",
        "language": "pt_BR",
        "contacts_list": ["5511999990001", "5511999990002"],
        "schedule_at": datetime.now(timezone.utc).isoformat(),
        "delay_seconds": 5,
        "concurrency_limit": 1
    }
    
    response = client.post("/api/bulk-send/schedule", json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Sucesso! Trigger criado com ID: {data.get('id')}")
        print(f"   Status: {data.get('status')}")
    else:
        print(f"❌ Falha: {response.status_code}")
        print(response.text)

def test_ab_dispatch():
    print("\n[TEST] Iniciando Teste A/B (50/50)...")
    headers = get_auth_headers()
    
    # 4 contatos para dividir 2 para cada
    contacts = [
        "5511999991001", "5511999991002",
        "5511999991003", "5511999991004"
    ]
    
    payload = {
        "variations": [
            {
                "template_name": "teste_ab_var_A",
                "weight": 50,
                "language": "pt_BR",
                "components": []
            },
            {
                "template_name": "teste_ab_var_B",
                "weight": 50,
                "language": "en_US",
                "components": []
            }
        ],
        "schedule_at": datetime.now(timezone.utc).isoformat(),
        "contacts_list": contacts,
        "delay_seconds": 5,
        "concurrency_limit": 1
    }
    
    response = client.post("/api/bulk-send/schedule", json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        first_id = data.get('id')
        print(f"✅ Sucesso na Requisição! ID retornado (primeiro): {first_id}")
        
        # Verificar no banco se criou o segundo
        db = SessionLocal()
        # Buscar triggers criados nos ultimos segundos com esses nomes
        triggers = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.template_name.like("teste_ab_var_%")
        ).order_by(models.ScheduledTrigger.id.desc()).limit(2).all()
        
        print(f"🔍 Verificação no Banco (devem ter 2 registros): Encontrados {len(triggers)}")
        for t in triggers:
            print(f"   - ID: {t.id} | Template: {t.template_name} | Contatos: {len(t.contacts_list)}")
            
        db.close()
    else:
        print(f"❌ Falha: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    # Limpar overrides antes de começar
    app.dependency_overrides = {}
    
    try:
        test_single_dispatch()
        test_ab_dispatch()
    except Exception as e:
        print(f"⚠️ Erro ao executar testes: {e}")

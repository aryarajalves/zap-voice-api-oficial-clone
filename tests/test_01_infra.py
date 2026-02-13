import os
import socket
import psycopg2
import requests
import psutil
from dotenv import load_dotenv

# Carrega do backend/.env que é o mais completo
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

def check_port(host, port, name):
    try:
        with socket.create_connection((host, port), timeout=2):
            return True, f"✅ {name} ({host}:{port}) - Aberto"
    except Exception as e:
        return False, f"❌ {name} ({host}:{port}) - Erro: {e}"

def test_postgres():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return False, "❌ DATABASE_URL não definido"
    
    # Ajuste para rodar fora do docker (localhost em vez de zapvoice-postgres)
    if "zapvoice-postgres" in db_url:
        db_url = db_url.replace("zapvoice-postgres", "localhost")
        
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        return True, "✅ Postgres - Conexão estabelecida com sucesso"
    except Exception as e:
        return False, f"❌ Postgres - Erro na conexão: {e}"

def test_chatwoot():
    url = os.getenv("CHATWOOT_API_URL")
    token = os.getenv("CHATWOOT_API_TOKEN")
    account_id = os.getenv("CHATWOOT_ACCOUNT_ID")
    
    # Se não houver no ENV, tenta buscar no Banco de Dados para o cliente 1 (padrão)
    if not url or not token:
        try:
            db_url = os.getenv("DATABASE_URL")
            if "zapvoice-postgres" in db_url: db_url = db_url.replace("zapvoice-postgres", "localhost")
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("SELECT key, value FROM app_config WHERE client_id = 1 AND key IN ('CHATWOOT_API_URL', 'CHATWOOT_API_TOKEN', 'CHATWOOT_ACCOUNT_ID')")
            configs = dict(cur.fetchall())
            url = configs.get('CHATWOOT_API_URL') or url
            token = configs.get('CHATWOOT_API_TOKEN') or token
            account_id = configs.get('CHATWOOT_ACCOUNT_ID') or account_id
            cur.close()
            conn.close()
        except:
            pass

    if not url or not token:
        return False, "⚠️ Chatwoot - Configurações ausentes (URL ou TOKEN) no ENV e no Banco"
    
    try:
        # Chatwoot Profile é um endpoint seguro para testar o TOKEN
        response = requests.get(f"{url}/profile", headers={"api_access_token": token}, timeout=5)
        if response.status_code == 200:
            user_data = response.json()
            return True, f"✅ Chatwoot - Conectado como {user_data.get('name')} em {url}"
        return False, f"❌ Chatwoot - Erro de Autenticação ({response.status_code}): Verifique o Token"
    except Exception as e:
        return False, f"❌ Chatwoot - Erro de conexão: {e}"

def test_worker():
    """Verifica se o processo do worker está rodando (Local ou Docker)."""
    # 1. Verifica no Docker (mais comum no setup do projeto)
    try:
        import subprocess
        # Busca containers com nome zapvoice_worker, pegando status e estado
        res = subprocess.run(
            ["docker", "ps", "-a", "--filter", "name=zapvoice_worker", "--format", "{{.Names}}: {{.Status}} ({{.State}})"], 
            capture_output=True, text=True, check=False
        )
        if res.stdout:
            if "running" in res.stdout:
                return True, f"✅ Worker - Rodando no Docker: {res.stdout.strip()}"
            else:
                return False, f"❌ Worker - Container Docker existe mas está PARADO: {res.stdout.strip()}"
    except Exception:
        pass

    # 2. Verifica Localmente (psutil)
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline')
            if cmdline:
                is_python = any('python' in part.lower() for part in cmdline)
                is_worker = any('worker.py' in part.lower() for part in cmdline)
                if is_python and is_worker:
                    return True, f"✅ Worker - Rodando Local (PID: {proc.info['pid']})"
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
            
    return False, "❌ Worker - NÃO está rodando (Docker zapvoice_worker ou Local backend/worker.py)"

def run_infra_tests():
    print("\n--- [01] Testes de Infraestrutura ---")
    
    results = [
        test_postgres(),
        check_port("localhost", 5672, "RabbitMQ"),
        check_port("localhost", 9000, "MinIO API"),
        test_chatwoot(),
        test_worker()
    ]
    
    for success, msg in results:
        print(msg)

if __name__ == "__main__":
    run_infra_tests()

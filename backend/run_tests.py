
import os
import subprocess
import sys

# Define a URL do banco de dados para o teste
os.environ["DATABASE_URL"] = "sqlite:///./test_zapvoice.db"

# Remove o arquivo do banco se já existir para começar do zero
if os.path.exists("./test_zapvoice.db"):
    os.remove("./test_zapvoice.db")

# Executa o script de teste
print(f"🚀 Rodando teste de idempotência com DATABASE_URL={os.environ['DATABASE_URL']}")
result = subprocess.run([sys.executable, "tests/test_idempotency.py"], cwd=".")

if result.returncode == 0:
    print("✅ Sucesso!")
else:
    print(f"❌ Falha (Código: {result.returncode})")
    sys.exit(result.returncode)

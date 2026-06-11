import os
import socket

# Load .env manually BEFORE database/models import
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value.strip('"').strip("'")

load_env()

DATABASE_URL = os.getenv("DATABASE_URL")

# Auto-detect if we can resolve the docker database host 'zapvoice-postgres'
def can_resolve(host):
    try:
        socket.gethostbyname(host)
        return True
    except socket.gaierror:
        return False

if DATABASE_URL:
    if "zapvoice-postgres" in DATABASE_URL:
        if not can_resolve("zapvoice-postgres"):
            # Running outside docker, map host and port
            DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres:5432", "localhost:5435")
            DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres", "localhost")
            print("[INFO] Rodando fora do Docker. Ajustando DATABASE_URL para localhost:5435.")
            os.environ["DATABASE_URL"] = DATABASE_URL
        else:
            print("[INFO] Rodando dentro do Docker. Usando DATABASE_URL padrao do container.")

if not os.getenv("DATABASE_URL"):
    print("[ERROR] DATABASE_URL nao encontrada no .env")
    exit(1)

from database import Base
from sqlalchemy import create_engine
import models

engine = create_engine(os.getenv("DATABASE_URL"))
try:
    Base.metadata.create_all(bind=engine)
    print("[SUCCESS] Tabela resting_contacts criada ou ja existente com sucesso.")
except Exception as e:
    print(f"[ERROR] Erro ao criar a tabela resting_contacts: {e}")

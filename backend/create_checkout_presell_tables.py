import os
import socket

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

def can_resolve(host):
    try:
        socket.gethostbyname(host)
        return True
    except socket.gaierror:
        return False

if DATABASE_URL:
    if "zapvoice-postgres" in DATABASE_URL:
        if not can_resolve("zapvoice-postgres"):
            DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres:5432", "localhost:5435")
            DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres", "localhost")
            os.environ["DATABASE_URL"] = DATABASE_URL

from database import Base
from sqlalchemy import create_engine
import models

engine = create_engine(os.getenv("DATABASE_URL"))
try:
    Base.metadata.create_all(bind=engine)
    print("[SUCCESS] Tabelas checkout_configs e checkout_leads criadas com sucesso.")
except Exception as e:
    print(f"[ERROR] Erro ao criar tabelas checkout_presell: {e}")

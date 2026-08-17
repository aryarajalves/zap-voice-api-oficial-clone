import os
import sys
import socket

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
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

if DATABASE_URL and "zapvoice-postgres" in DATABASE_URL:
    if not can_resolve("zapvoice-postgres"):
        DATABASE_URL = DATABASE_URL.replace("zapvoice-postgres:5432", "localhost:5435").replace("zapvoice-postgres", "localhost")
        os.environ["DATABASE_URL"] = DATABASE_URL

from database import SessionLocal
import models

db = SessionLocal()
clients = db.query(models.Client).all()
print(f"[INFO] Populando mensagens rapidas para {len(clients)} clientes...")

samples = [
    ("pix", "Chave PIX e Instruções", "Olá {{primeiro_nome}}, segue nossa chave PIX CNPJ: 12.345.678/0001-90. Após o envio, nos mande o comprovante!"),
    ("ola", "Boas-vindas Padrão", "Olá {{nome}}, tudo bem? Como posso te ajudar hoje?"),
    ("horario", "Horário de Funcionamento", "Olá {{primeiro_nome}}, nosso atendimento funciona de segunda a sexta das 09h às 18h.")
]

for c in clients:
    for shortcut, title, content in samples:
        existing = db.query(models.QuickMessage).filter_by(client_id=c.id, shortcut=shortcut).first()
        if not existing:
            db.add(models.QuickMessage(client_id=c.id, shortcut=shortcut, title=title, content=content))

db.commit()
db.close()
print("[SUCCESS] Mensagens rapidas populadas com sucesso!")

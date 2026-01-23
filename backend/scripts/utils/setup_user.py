"""
Script para criar tabelas e usuário
"""
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from database import engine
import models
import hashlib

# Criar todas as tabelas
print("📋 Criando tabelas...")
models.Base.metadata.create_all(bind=engine)
print("✅ Tabelas criadas!")

# Criar usuário
from database import SessionLocal

db = SessionLocal()

try:
    # Criar usuário
    user = models.User(
        email="aryarajunity@gmail.com",
        full_name="Aryaraj",
        hashed_password=hashlib.sha256("HareHare@03".encode()).hexdigest(),
        is_active=True
    )
    db.add(user)
    db.commit()
    print("✅ Usuário criado!")
    print("\n📧 Email: aryarajunity@gmail.com")
    print("🔑 Senha: HareHare@03")
    
finally:
    db.close()

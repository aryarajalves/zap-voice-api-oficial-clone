"""
Script para garantir que o usuário admin exista no Postgres
"""
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
import models
import hashlib
from sqlalchemy.exc import IntegrityError

db = SessionLocal()

try:
    print("👤 Verificando usuário...")
    # Tentar criar usuário
    user = models.User(
        email="aryarajunity@gmail.com",
        full_name="Aryaraj",
        hashed_password=hashlib.sha256("HareHare@03".encode()).hexdigest(),
        is_active=True
    )
    db.add(user)
    db.commit()
    print("✅ Usuário criado com sucesso!")
    
except IntegrityError:
    db.rollback()
    print("⚠️  Usuário já existe (IntegrityError). Atualizando senha...")
    user = db.query(models.User).filter(models.User.email == "aryarajunity@gmail.com").first()
    if user:
        user.hashed_password = hashlib.sha256("HareHare@03".encode()).hexdigest()
        db.commit()
        print("🔑 Senha atualizada!")
    else:
        print("❌ Erro estranho: IntegrityError mas usuário não encontrado?")

except Exception as e:
    print(f"❌ Erro: {e}")
    
finally:
    db.close()
    print("\n📧 Email: aryarajunity@gmail.com")
    print("🔑 Senha: HareHare@03")

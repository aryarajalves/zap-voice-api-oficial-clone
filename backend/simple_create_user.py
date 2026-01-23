"""
Script SIMPLES para criar usuário usando models.py e database.py
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal
import models
import hashlib

def create_user():
    db = SessionLocal()
    
    try:
        # Verificar se usuário existe
        existing = db.query(models.User).filter(models.User.email == "aryarajunity@gmail.com").first()
        
        if existing:
            print(f"✅ Usuário já existe: {existing.email}")
            # Atualizar senha
            existing.hashed_password = hashlib.sha256("HareHare@03".encode()).hexdigest()
            db.commit()
            print("🔑 Senha atualizada!")
        else:
            # Criar novo usuário
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

if __name__ == "__main__":
    create_user()

import sys
import os
from dotenv import load_dotenv

# Ensure we are in the correct directory to import local modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from database import SessionLocal
import models
from core.security import get_password_hash

def main():
    users_to_create = [
        {"email": "aryarajmarketing@gmail.com", "password": "ary@2026", "full_name": "Aryaraj Marketing"},
        {"email": "aryarajunity@gmail.com", "password": "ary@2026", "full_name": "Aryaraj Unity"}
    ]

    db = SessionLocal()
    try:
        for user_data in users_to_create:
            email = user_data["email"]
            password = user_data["password"]
            full_name = user_data["full_name"]
            
            print(f"Iniciando criação/atualização de usuário: {email}")
            # Check if user already exists
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                print(f"Usuário {email} já existe. Atualizando senha...")
                user.hashed_password = get_password_hash(password)
                user.full_name = full_name
                user.is_active = True
            else:
                print(f"Criando novo usuário {email}...")
                user = models.User(
                    email=email,
                    full_name=full_name,
                    hashed_password=get_password_hash(password),
                    is_active=True
                )
                db.add(user)
        
        db.commit()
        print(f"✅ Sucesso! Usuários prontos para login.")
    except Exception as e:
        print(f"❌ Erro ao criar usuário: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

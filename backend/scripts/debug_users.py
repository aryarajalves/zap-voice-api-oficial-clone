
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Adicionar caminho do backend ao sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import Base, SQLALCHEMY_DATABASE_URL
from models import User

def list_users():
    print(f"Conectando ao banco: {SQLALCHEMY_DATABASE_URL}")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        users = session.query(User).all()
        print(f"\nTotal de usuários: {len(users)}")
        for u in users:
            print(f"- ID: {u.id} | Email: {u.email} | Role: {u.role} | Active: {u.is_active}")
            
        env_email = os.getenv("SUPER_ADMIN_EMAIL")
        print(f"\nEmail configurado no ENV (SUPER_ADMIN_EMAIL): '{env_email}'")
        
    except Exception as e:
        print(f"Erro ao listar usuários: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    list_users()

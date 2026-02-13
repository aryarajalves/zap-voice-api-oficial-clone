
import os
import sys
from dotenv import load_dotenv

# Adiciona o diretório backend ao sys.path para importar models e database
# Assume que estamos sendo executados da raiz do projeto
project_root = r"c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot"
sys.path.append(os.path.join(project_root, 'backend'))

load_dotenv(dotenv_path=os.path.join(project_root, 'backend', '.env'))

from database import SessionLocal
import models
from core.security import verify_password, get_password_hash

def check_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"\n--- Total de usuários: {len(users)} ---")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Ativo: {u.is_active}")
            # Testar a senha padrão do .env (123456)
            env_pass = os.getenv("SUPER_ADMIN_PASSWORD", "123456")
            is_match = verify_password(env_pass, u.hashed_password)
            print(f"  > Senha do .env ({env_pass}) confere? {'SIM' if is_match else 'NÃO'}")
            
    except Exception as e:
        print(f"Erro ao verificar usuários: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()

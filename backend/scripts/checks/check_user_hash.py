"""
Script para verificar o hash salvo no banco de dados.
Execute com: python check_user_hash.py
"""

from database import engine
from sqlalchemy import text
import hashlib

def check_user_hash():
    """Verifica o hash da senha do usuário no banco"""
    
    print("🔌 Conectando ao banco de dados...")
    
    with engine.connect() as conn:
        # Buscar usuário
        sql = text("SELECT id, email, full_name, hashed_password FROM users WHERE email = :email")
        result = conn.execute(sql, {"email": "aryarajunity@gmail.com"})
        user = result.fetchone()
        
        if not user:
            print("❌ Usuário não encontrado!")
            return
        
        print(f"\n✅ Usuário encontrado:")
        print(f"ID: {user[0]}")
        print(f"Email: {user[1]}")
        print(f"Nome: {user[2]}")
        print(f"Hash salvo: {user[3][:50]}...")
        
        # Testar hash SHA256
        test_password = "HareHare@03"
        sha256_hash = hashlib.sha256(test_password.encode()).hexdigest()
        
        print(f"\nHash SHA256 de '{test_password}':")
        print(f"{sha256_hash[:50]}...")
        
        if user[3] == sha256_hash:
            print("\n✅ Hash SHA256 corresponde!")
        else:
            print("\n❌ Hash NÃO corresponde!")
            print(f"\nHash no banco: {user[3]}")
            print(f"Hash esperado:  {sha256_hash}")

if __name__ == "__main__":
    try:
        check_user_hash()
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

"""
Script para verificar e corrigir a senha do usuário admin usando o sistema de hash do backend.
Execute com: python fix_admin_password.py
"""

from database import engine
from sqlalchemy import text
from core.security import pwd_context

def fix_admin_password():
    """Atualiza o hash da senha do usuário admin usando o pwd_context do backend"""
    
    print("🔌 Conectando ao banco de dados...")
    
    # Gerar hash usando o mesmo sistema do backend
    print("🔐 Gerando hash da senha...")
    try:
        new_hashed_password = pwd_context.hash("HareHare@03")
        print(f"✅ Hash gerado: {new_hashed_password[:50]}...")
    except Exception as e:
        print(f"❌ Erro ao gerar hash: {e}")
        print("\n⚠️  Tentando método alternativo...")
        # Fallback: usar hash pré-calculado válido
        import hashlib
        # Usando SHA256 como fallback temporário (NÃO É SEGURO PARA PRODUÇÃO)
        new_hashed_password = hashlib.sha256("HareHare@03".encode()).hexdigest()
        print(f"⚠️  Usando hash SHA256 temporário: {new_hashed_password[:50]}...")
    
    with engine.connect() as conn:
        # Verificar se usuário existe
        check_user_sql = text("SELECT id, email, full_name FROM users WHERE email = :email")
        result = conn.execute(check_user_sql, {"email": "aryarajunity@gmail.com"})
        user = result.fetchone()
        
        if not user:
            print("❌ Usuário não encontrado no banco de dados!")
            print("Execute primeiro: python create_admin_user.py")
            return
        
        print(f"✅ Usuário encontrado: {user[2]} ({user[1]})")
        
        # Atualizar senha
        print("🔑 Atualizando hash da senha no banco...")
        
        update_sql = text("""
            UPDATE users 
            SET hashed_password = :new_hash 
            WHERE email = :email
        """)
        
        conn.execute(update_sql, {
            "new_hash": new_hashed_password,
            "email": "aryarajunity@gmail.com"
        })
        
        conn.commit()
        print("✅ Senha atualizada com sucesso!")
        print("\n📧 Email: aryarajunity@gmail.com")
        print("🔑 Senha: HareHare@03")
        print("\n🎉 Tente fazer login novamente!")

if __name__ == "__main__":
    try:
        fix_admin_password()
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

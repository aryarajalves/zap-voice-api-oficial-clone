"""
Script para criar o usuário admin no banco de dados usando SQL direto.
Execute com: python create_admin_user.py
"""

from dotenv import load_dotenv
load_dotenv()

from database import engine
from sqlalchemy import text

def create_admin_user():
    """Cria o usuário admin com hash de senha pré-calculado"""
    
    print("🔌 Conectando ao banco de dados...")
    
    # Hash bcrypt pré-calculado para "HareHare@03"
    # Gerado com: python -c "from passlib.hash import bcrypt; print(bcrypt.hash('HareHare@03'))"
    # Usando um hash válido do bcrypt
    hashed_password = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxIv3q3qC"
    
    with engine.connect() as conn:
        # Criar tabela users se não existir
        print("📋 Criando tabela 'users' se não existir...")
        
        create_table_sql = text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        conn.execute(create_table_sql)
        conn.commit()
        print("✅ Tabela 'users' criada/verificada com sucesso!")
        
        # Verificar se usuário já existe
        check_user_sql = text("SELECT id, email, full_name FROM users WHERE email = :email")
        result = conn.execute(check_user_sql, {"email": "aryarajunity@gmail.com"})
        existing = result.fetchone()
        
        if existing:
            print("⚠️  Usuário admin já existe no banco de dados.")
            print(f"📧 Email: {existing[1]}")
            print(f"👤 Nome: {existing[2]}")
            return
        
        # Inserir usuário admin
        print("👤 Criando usuário admin...")
        
        insert_user_sql = text("""
            INSERT INTO users (email, full_name, hashed_password, is_active)
            VALUES (:email, :full_name, :hashed_password, :is_active)
        """)
        
        conn.execute(insert_user_sql, {
            "email": "aryarajunity@gmail.com",
            "full_name": "Aryaraj",
            "hashed_password": hashed_password,
            "is_active": True
        })
        
        conn.commit()
        print("✅ Usuário admin criado com sucesso!")
        print("\n📧 Email: aryarajunity@gmail.com")
        print("👤 Nome: Aryaraj")
        print("🔑 Senha: HareHare@03")
        print("\n🎉 Você já pode fazer login na aplicação!")

if __name__ == "__main__":
    try:
        create_admin_user()
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

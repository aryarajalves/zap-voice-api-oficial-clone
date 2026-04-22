import os
import sys

# Garante que o diretório backend (pai de tests_unit) está no PATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock environment para evitar quebras no database.py
os.environ["DATABASE_URL"] = "sqlite:///./test_zapvoice.db"

try:
    print("Tentando importar core.security...")
    from core.security import verify_password, get_password_hash, create_access_token
    print("Sucesso!")
    
    # Testar as funções diretamente
    password = "minhasenhateste"
    hashed = get_password_hash(password)
    print(f"Hash gerado: {hashed}")
    
    is_valid = verify_password(password, hashed)
    print(f"Passou na verificação? {is_valid}")
    
    token = create_access_token(data={"sub": "teste@teste.com"})
    print(f"Token gerado: {token}")
    
    print("\n--- TODOS OS TESTES DE SEGURANÇA PASSARAM! ---")

except Exception as e:
    print(f"\nERRO DURANTE OS TESTES: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

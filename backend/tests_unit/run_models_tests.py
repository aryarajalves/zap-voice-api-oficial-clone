import os
import sys
from datetime import datetime, timezone

# Ajusta PATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite:///./test_models_direct.db"

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from database import Base
    from models import Client, User, Funnel

    # Setup
    engine = create_engine("sqlite:///./test_models_direct.db")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    print("Testando criação de Client...")
    client = Client(name=f"Test Client {datetime.now()}")
    db.add(client)
    db.commit()
    print(f"Sucesso! Client ID: {client.id}")

    print("Testando criação de User...")
    user = User(email=f"test_{datetime.now().timestamp()}@user.com", hashed_password="pw", client_id=client.id)
    db.add(user)
    db.commit()
    print(f"Sucesso! User ID: {user.id}")

    print("Testando criação de Funnel...")
    funnel = Funnel(name="Funnel Test", client_id=client.id, steps=[])
    db.add(funnel)
    db.commit()
    print(f"Sucesso! Funnel ID: {funnel.id}")

    print("\n--- TODOS OS TESTES DE MODELO PASSARAM! ---")
    
    # Clean up
    db.close()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_models_direct.db"):
        os.remove("./test_models_direct.db")

except Exception as e:
    print(f"ERRO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

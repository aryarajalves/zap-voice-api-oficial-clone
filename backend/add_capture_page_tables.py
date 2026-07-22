import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base

sys.path.append(os.path.dirname(__file__))

def run_migration():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        db_url = db_url.strip('"').strip("'")
    else:
        db_url = "sqlite:///./zapvoice.db"
        
    print(f"Iniciando criação/sincronização de tabelas em {db_url}...")
    
    if db_url.startswith("sqlite"):
        from sqlalchemy.pool import StaticPool
        engine = create_engine(db_url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    else:
        engine = create_engine(db_url)
        
    import models
    models.Base.metadata.create_all(bind=engine)
    print("SUCCESS: Tabelas capture_page_configs e capture_page_leads sincronizadas com sucesso!")

if __name__ == "__main__":
    run_migration()

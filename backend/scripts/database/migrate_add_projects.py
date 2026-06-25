import sys
import os
from sqlalchemy import create_engine, text

# Ajustar path no container (/app é a raiz do backend)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append("/app")
sys.path.append(os.getcwd())

def run_migration():
    print("🚀 Iniciando migração do banco de dados (Projeto/Clientes)...")
    from database import SQLALCHEMY_DATABASE_URL
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        # 1. Criar a tabela 'projects' se não existir
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """) if "postgresql" in SQLALCHEMY_DATABASE_URL else text("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            );
        """))
        print("✅ Tabela 'projects' garantida.")

        # 2. Adicionar 'project_id' em 'clients'
        try:
            conn.execute(text("ALTER TABLE clients ADD COLUMN project_id INTEGER;"))
            print("✅ Coluna 'project_id' adicionada a 'clients'.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Coluna 'project_id' já existe em 'clients'.")
            else:
                print(f"⚠️ Erro ao adicionar project_id em clients: {e}")

        # 3. Adicionar 'project_id' e 'imported_by_client_id' em 'webhook_leads'
        try:
            conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN project_id INTEGER;"))
            print("✅ Coluna 'project_id' adicionada a 'webhook_leads'.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Coluna 'project_id' já existe em 'webhook_leads'.")
            else:
                print(f"⚠️ Erro ao adicionar project_id em webhook_leads: {e}")

        try:
            conn.execute(text("ALTER TABLE webhook_leads ADD COLUMN imported_by_client_id INTEGER;"))
            print("✅ Coluna 'imported_by_client_id' adicionada a 'webhook_leads'.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Coluna 'imported_by_client_id' já existe em 'webhook_leads'.")
            else:
                print(f"⚠️ Erro ao adicionar imported_by_client_id em webhook_leads: {e}")

        # 4. Adicionar 'project_id' em 'contact_import_history'
        try:
            conn.execute(text("ALTER TABLE contact_import_history ADD COLUMN project_id INTEGER;"))
            print("✅ Coluna 'project_id' adicionada a 'contact_import_history'.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Coluna 'project_id' já existe em 'contact_import_history'.")
            else:
                print(f"⚠️ Erro ao adicionar project_id em contact_import_history: {e}")

        # 5. Criar chaves estrangeiras se Postgres
        if "postgresql" in SQLALCHEMY_DATABASE_URL:
            try:
                conn.execute(text("ALTER TABLE clients ADD CONSTRAINT fk_clients_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;"))
                print("✅ FK fk_clients_project criada.")
            except Exception: pass
            
            try:
                conn.execute(text("ALTER TABLE webhook_leads ADD CONSTRAINT fk_webhook_leads_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;"))
                conn.execute(text("ALTER TABLE webhook_leads ADD CONSTRAINT fk_webhook_leads_imported_by FOREIGN KEY (imported_by_client_id) REFERENCES clients(id) ON DELETE SET NULL;"))
                print("✅ FKs em webhook_leads criadas.")
            except Exception: pass
            
            try:
                conn.execute(text("ALTER TABLE contact_import_history ADD CONSTRAINT fk_import_history_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;"))
                print("✅ FK fk_import_history_project criada.")
            except Exception: pass

        conn.commit()
    print("🎉 Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()

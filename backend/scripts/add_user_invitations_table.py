import os
import sys
from dotenv import load_dotenv

# Adiciona o diretório backend ao path para que possamos importar os módulos locais
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)
load_dotenv(os.path.join(backend_dir, '.env'))

from database import engine
from models import Base
from core.logger import logger

def run_migration():
    print("Iniciando migração de banco de dados para tabela de convites...")
    logger.info("Starting migration: creating user_invitations and invitation_clients tables")
    
    try:
        # create_all criará apenas as tabelas ausentes e não causará perda de dados nas existentes
        Base.metadata.create_all(bind=engine, tables=[
            Base.metadata.tables["user_invitations"],
            Base.metadata.tables["invitation_clients"]
        ])
        print("✅ Tabelas 'user_invitations' e 'invitation_clients' criadas com sucesso (ou já existiam).")
        logger.info("Successfully created user_invitations and invitation_clients tables")
    except Exception as e:
        print(f"❌ Erro ao criar tabelas de convite: {e}")
        logger.error(f"Error creating user_invitations tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

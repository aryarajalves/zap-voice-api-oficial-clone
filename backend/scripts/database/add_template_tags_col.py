import os
import sys
from dotenv import load_dotenv

# Adicionar o diretório raiz ao sys.path para permitir imports de database
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Carregar arquivo .env da raiz antes de importar do database
env_path = os.path.join(root_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Tenta carregar do diretório atual se executado de outro lugar
    load_dotenv()

from sqlalchemy import text, inspect
from database import engine
from core.logger import setup_logger

logger = setup_logger("MigrationTemplateTags")

def run_migration():
    logger.info("🏗️  Iniciando migração para adicionar coluna 'tags' a 'whatsapp_template_cache'...")
    inspector = inspect(engine)
    
    table_name = "whatsapp_template_cache"
    column_name = "tags"
    
    try:
        if not inspector.has_table(table_name):
            logger.error(f"❌ Tabela '{table_name}' não existe no banco de dados.")
            return

        existing_columns = [c['name'].lower() for c in inspector.get_columns(table_name)]
        
        if column_name not in existing_columns:
            logger.info(f"➕ Adicionando coluna '{column_name}' à tabela '{table_name}'...")
            with engine.connect() as conn:
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" TEXT'))
                conn.commit()
            logger.info(f"✅ Coluna '{column_name}' adicionada com sucesso!")
        else:
            logger.info(f"✨ A coluna '{column_name}' já existe na tabela '{table_name}'. Nenhuma ação necessária.")
            
    except Exception as e:
        logger.error(f"💥 Erro ao executar migração: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

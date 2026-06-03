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
    load_dotenv()

from sqlalchemy import text, inspect
from database import engine
from core.logger import setup_logger

logger = setup_logger("MigrationManyChatAlternativeTag")

def run_migration():
    logger.info("🏗️  Iniciando migração para adicionar colunas 'manychat_start_date' e 'manychat_tag_alternative' a 'webhook_event_mappings'...")
    inspector = inspect(engine)
    
    table_name = "webhook_event_mappings"
    
    try:
        if not inspector.has_table(table_name):
            logger.error(f"❌ Tabela '{table_name}' não existe no banco de dados.")
            return

        existing_columns = [c['name'].lower() for c in inspector.get_columns(table_name)]
        
        with engine.connect() as conn:
            # 1. Adicionar manychat_start_date
            if "manychat_start_date" not in existing_columns:
                logger.info("➕ Adicionando coluna 'manychat_start_date'...")
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "manychat_start_date" TIMESTAMP WITH TIME ZONE'))
                conn.commit()
                logger.info("✅ Coluna 'manychat_start_date' adicionada!")
            else:
                logger.info("✨ Coluna 'manychat_start_date' já existe.")

            # 2. Adicionar manychat_tag_alternative
            if "manychat_tag_alternative" not in existing_columns:
                logger.info("➕ Adicionando coluna 'manychat_tag_alternative'...")
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "manychat_tag_alternative" VARCHAR'))
                conn.commit()
                logger.info("✅ Coluna 'manychat_tag_alternative' adicionada!")
            else:
                logger.info("✨ Coluna 'manychat_tag_alternative' já existe.")
                
    except Exception as e:
        logger.error(f"💥 Erro ao executar migração: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

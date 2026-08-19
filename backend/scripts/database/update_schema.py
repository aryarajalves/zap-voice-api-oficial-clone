import os
import sys
import signal

# Adicionar o diretório raiz ao sys.path para permitir imports de database, modelos, etc.
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from sqlalchemy import text, inspect
from database import engine
from core.logger import logger

# Importar todos os modelos para garantir que o Base.metadata esteja populado
import models
from models import Base

def handler(signum, frame):
    raise TimeoutError("Tempo limite excedido para sincronização do esquema.")

def run_alembic_migrations():
    """Aplica migrações automatizadas via Alembic."""
    try:
        from alembic.config import Config
        from alembic import command
        ini_path = os.path.join(root_dir, "alembic.ini")
        if os.path.exists(ini_path):
            alembic_cfg = Config(ini_path)
            alembic_cfg.set_main_option("script_location", os.path.join(root_dir, "alembic_migrations"))
            logger.info("📦 Executando migrações Alembic (alembic upgrade head)...")
            command.upgrade(alembic_cfg, "head")
            logger.info("✅ Migrações Alembic aplicadas com sucesso.")
    except Exception as e_alembic:
        logger.warning(f"⚠️ Aviso na execução do Alembic: {e_alembic}")

def update_schema():
    """
    Sincronização Dinâmica: Compara os Modelos (Python) com o Banco de Dados (PostgreSQL)
    e adiciona automaticamente qualquer coluna faltante durante o boot do container.
    """
    # 0. Executa migrações estruturadas do Alembic
    run_alembic_migrations()

    logger.info("🏗️  Iniciando sincronização dinâmica de esquema...")
    
    # Configurar timeout de 30 segundos para o processo
    signal.signal(signal.SIGALRM, handler)
    signal.alarm(30)
    
    try:
        # 1. Garantir que as tabelas existam
        Base.metadata.create_all(bind=engine)
        
        with engine.connect() as conn:
            # Buscar todas as colunas existentes de uma vez
            query = text("""
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
            """)
            result = conn.execute(query)
            existing_cols_map = {}
            for row in result:
                tbl = row[0].lower()
                col = row[1].lower()
                if tbl not in existing_cols_map:
                    existing_cols_map[tbl] = set()
                existing_cols_map[tbl].add(col)
            
            tables = Base.metadata.tables
            changes_made = 0
            
            for table_name, table_obj in tables.items():
                table_name_lower = table_name.lower()
                existing_columns = existing_cols_map.get(table_name_lower, set())
                
                for column in table_obj.columns:
                    col_name = column.name.lower()
                    
                    if col_name not in existing_columns:
                        logger.info(f"➕ [AUTO-MIGRATE] Adicionando coluna: {table_name}.{column.name}")
                        
                        try:
                            # Tradução de tipos para SQL
                            col_type = str(column.type).upper()
                            if "VARCHAR" in col_type: col_type = "VARCHAR"
                            elif "INTEGER" in col_type: col_type = "INTEGER"
                            elif "BOOLEAN" in col_type: col_type = "BOOLEAN DEFAULT FALSE"
                            elif "JSON" in col_type: col_type = "JSONB DEFAULT '[]'"
                            elif "DATETIME" in col_type: col_type = "TIMESTAMP WITH TIME ZONE"
                            elif "FLOAT" in col_type: col_type = "FLOAT DEFAULT 0.0"
                            elif "TEXT" in col_type: col_type = "TEXT"
                            elif "UUID" in col_type: col_type = "UUID"

                            conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'))
                            conn.commit()
                            changes_made += 1
                        except Exception as e_col:
                            logger.error(f"❌ Erro ao adicionar {table_name}.{column.name}: {e_col}")
                            conn.rollback()

            if changes_made > 0:
                logger.info(f"✅ Sincronização concluída! {changes_made} colunas adicionadas.")
            else:
                logger.info("✨ Esquema do banco de dados já está atualizado.")
                
    except TimeoutError as te:
        logger.error(f"⏳ {te}")
    except Exception as e:
        logger.error(f"💥 Erro fatal na sincronização: {e}")
    finally:
        signal.alarm(0)

if __name__ == "__main__":
    update_schema()

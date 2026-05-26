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

def update_schema():
    """
    Sincronização Dinâmica: Compara os Modelos (Python) com o Banco de Dados (PostgreSQL)
    e adiciona automaticamente qualquer coluna faltante durante o boot do container.
    """
    logger.info("🏗️  Iniciando sincronização dinâmica de esquema...")
    
    # Configurar timeout de 30 segundos para o processo
    signal.signal(signal.SIGALRM, handler)
    signal.alarm(30)
    
    try:
        inspector = inspect(engine)
        
        # 1. Garantir que as tabelas existam
        Base.metadata.create_all(bind=engine)
        
        with engine.connect() as conn:
            tables = Base.metadata.tables
            changes_made = 0
            
            for table_name, table_obj in tables.items():
                if not inspector.has_table(table_name):
                    continue
                
                # Pegar colunas existentes no banco
                existing_columns = [c['name'].lower() for c in inspector.get_columns(table_name)]
                
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

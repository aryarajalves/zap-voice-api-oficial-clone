import os
import sys

# Adicionar o diretório raiz ao sys.path para permitir imports de database, models, etc.
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

def update_schema():
    """
    Sincronização Dinâmica: Compara os Modelos (Python) com o Banco de Dados (PostgreSQL)
    e adiciona automaticamente qualquer coluna faltante durante o boot do container.
    """
    logger.info("🏗️  Iniciando sincronização dinâmica de esquema...")
    
    inspector = inspect(engine)
    
    try:
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
                            if "INTEGER" in col_type: col_type = "INTEGER"
                            if "BOOLEAN" in col_type: col_type = "BOOLEAN DEFAULT FALSE"
                            if "JSON" in col_type: col_type = "JSONB DEFAULT '[]'"
                            if "DATETIME" in col_type: col_type = "TIMESTAMP WITH TIME ZONE"
                            if "FLOAT" in col_type: col_type = "FLOAT DEFAULT 0.0"
                            if "TEXT" in col_type: col_type = "TEXT"
                            if "UUID" in col_type: col_type = "UUID"

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
                
    except Exception as e:
        logger.error(f"💥 Erro fatal na sincronização: {e}")
        # Não damos sys.exit(1) para não impedir o boot da API se for um erro menor
        pass

if __name__ == "__main__":
    update_schema()

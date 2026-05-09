import os
import logging
from sqlalchemy import create_engine, text, inspect
from database import SQLALCHEMY_DATABASE_URL
from models import Base
import models # Garante que todos os modelos sejam carregados

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sync_schema")

def sync_schema():
    if not SQLALCHEMY_DATABASE_URL:
        logger.error("DATABASE_URL não configurada no .env")
        return

    logger.info(f"Conectando ao banco de dados...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # 1. Criar tabelas que não existem
        logger.info("Verificando tabelas faltantes...")
        Base.metadata.create_all(bind=engine)
        
        with engine.connect() as conn:
            # 2. Verificar colunas para cada tabela
            for table_name, table in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    logger.info(f"Tabela {table_name} criada recentemente.")
                    continue
                
                # Pegar colunas existentes
                db_columns = {c['name']: c for c in inspector.get_columns(table_name)}
                
                for column in table.columns:
                    if column.name not in db_columns:
                        logger.info(f"➕ Coluna faltante detectada: {table_name}.{column.name}")
                        
                        # Preparar tipo
                        col_type = column.type.compile(engine.dialect)
                        
                        # Lógica de Default
                        default_clause = ""
                        if column.server_default is not None:
                            try:
                                default_clause = f" DEFAULT {column.server_default.arg.text}"
                            except:
                                pass
                        elif column.default is not None and not callable(column.default.arg):
                            val = column.default.arg
                            if isinstance(val, bool):
                                val = 'TRUE' if val else 'FALSE'
                            elif isinstance(val, str):
                                val = f"'{val}'"
                            default_clause = f" DEFAULT {val}"
                        
                        sql = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{column.name}" {col_type}{default_clause}'
                        logger.info(f"Executing: {sql}")
                        
                        try:
                            conn.execute(text(sql))
                            conn.commit()
                            logger.info(f"✅ Coluna {table_name}.{column.name} adicionada.")
                        except Exception as e:
                            logger.error(f"❌ Erro ao adicionar coluna {table_name}.{column.name}: {e}")
                            conn.rollback()
                    else:
                        # Opcional: verificar se o tipo bate (complexo demais para agora)
                        pass

        logger.info("🚀 Sincronização de esquema finalizada com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    sync_schema()

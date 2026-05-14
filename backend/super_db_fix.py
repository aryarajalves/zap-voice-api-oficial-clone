import os
import sys
from sqlalchemy import text, inspect
from database import engine
from core.logger import logger

# Importar todos os modelos para garantir que o Base.metadata esteja populado
import models
from models.trigger import WebhookEventMapping, ScheduledTrigger, MessageStatus
from models.client import Client
from models.funnel import Funnel

def super_fix():
    """
    Varredura completa: Compara os Modelos (Python) com o Banco de Dados (PostgreSQL)
    e adiciona automaticamente qualquer coluna faltante.
    """
    logger.info("🚀 Iniciando SUPER FIX do Banco de Dados...")
    
    inspector = inspect(engine)
    
    try:
        with engine.connect() as conn:
            # Pegar todas as tabelas registradas no SQLAlchemy
            from database import Base
            tables = Base.metadata.tables
            
            changes_made = 0
            
            for table_name, table_obj in tables.items():
                # Verificar se a tabela existe no banco
                if not inspector.has_table(table_name):
                    logger.warning(f"⚠️ Tabela '{table_name}' não existe no banco. O auto_migrate deve criá-la.")
                    continue
                
                # Pegar colunas existentes no banco para esta tabela
                existing_columns = [c['name'].lower() for c in inspector.get_columns(table_name)]
                
                for column in table_obj.columns:
                    col_name = column.name.lower()
                    
                    if col_name not in existing_columns:
                        logger.info(f"➕ [TABELA: {table_name}] Coluna faltante detectada: {column.name}")
                        
                        # Gerar o tipo SQL da coluna
                        try:
                            # Tradução simplificada de tipos para PostgreSQL
                            col_type = str(column.type).upper()
                            if "VARCHAR" in col_type: col_type = "VARCHAR"
                            if "INTEGER" in col_type: col_type = "INTEGER"
                            if "BOOLEAN" in col_type: col_type = "BOOLEAN DEFAULT FALSE"
                            if "JSONB" in col_type: col_type = "JSONB DEFAULT '[]'"
                            if "JSON" in col_type and "JSONB" not in col_type: col_type = "JSONB DEFAULT '[]'"
                            if "DATETIME" in col_type: col_type = "TIMESTAMP WITH TIME ZONE"
                            if "FLOAT" in col_type: col_type = "FLOAT DEFAULT 0.0"
                            if "TEXT" in col_type: col_type = "TEXT"
                            if "UUID" in col_type: col_type = "UUID"

                            # Executar o ALTER TABLE
                            conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'))
                            conn.commit()
                            logger.info(f"✅ Coluna '{column.name}' adicionada com sucesso.")
                            changes_made += 1
                        except Exception as e_col:
                            logger.error(f"❌ Erro ao adicionar '{column.name}' na tabela '{table_name}': {e_col}")
                            conn.rollback()

            if changes_made > 0:
                logger.info(f"🎉 SUPER FIX finalizado! {changes_made} colunas foram corrigidas.")
            else:
                logger.info("✨ Tudo certo! O banco de dados já está 100% sincronizado com os modelos.")
                
    except Exception as e:
        logger.error(f"💥 Erro fatal no SUPER FIX: {e}")
        sys.exit(1)

if __name__ == "__main__":
    super_fix()

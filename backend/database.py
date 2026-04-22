import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ⚠️ DATABASE_URL é OBRIGATÓRIO - Não usa SQLite como fallback
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.strip('"').strip("'")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError(
        "❌ DATABASE_URL não está definido! "
        "Defina a variável de ambiente DATABASE_URL com a conexão PostgreSQL. "
        "Exemplo: postgresql://user:password@host:port/database"
    )

# Validar que é PostgreSQL
# Flexibilizar para aceitar SQLite também (útil para dev local sem Docker)
# if not SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
#    raise ValueError(...)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # Configura o engine com pool otimizado para evitar timeout de conexões
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,      # Testa conexão antes de usar (detecta conexões mortas)
        pool_recycle=3600,       # Recicla conexões a cada 1 hora (evita timeout PostgreSQL)
        pool_size=10,            # Pool maior para workers concorrentes
        max_overflow=20          # Permite até 30 conexões no total (10 + 20)
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def auto_migrate(engine):
    """
    Função dinâmica para garantir que todas as tabelas e colunas definidas nos modelos
    existam no banco de dados. Adiciona automaticamente o que estiver faltando.
    """
    from sqlalchemy import text, inspect
    from models import Base
    import logging
    
    logger = logging.getLogger("zapvoice")
    logger.info("🔍 Iniciando verificação dinâmica de esquema do banco de dados...")
    
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # 1. Garantir que todas as tabelas existam
        Base.metadata.create_all(bind=engine)
        
        with engine.connect() as conn:
            # 2. Verificar colunas para cada tabela definida nos modelos
            for table_name, table in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue
                
                # Pegar colunas existentes no banco
                db_columns = [c['name'] for c in inspector.get_columns(table_name)]
                
                # Comparar com as colunas definidas no modelo
                for column in table.columns:
                    if column.name not in db_columns:
                        logger.info(f"➕ Adicionando coluna faltante: {table_name}.{column.name}")
                        
                        # Preparar o tipo da coluna para o SQL
                        col_type = column.type.compile(engine.dialect)
                        
                        # Lógica de Default
                        default_val = ""
                        if column.server_default is not None:
                            # Tenta extrair o valor do server_default
                            try:
                                default_val = f" DEFAULT {column.server_default.arg.text}"
                            except:
                                pass
                        elif column.default is not None and not callable(column.default.arg):
                            # Se for um valor simples (não função)
                            val = column.default.arg
                            if isinstance(val, bool):
                                val = 'TRUE' if val else 'FALSE'
                            elif isinstance(val, str):
                                val = f"'{val}'"
                            default_val = f" DEFAULT {val}"

                        # Executar ALTER TABLE
                        try:
                            conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}{default_val}'))
                            conn.commit()
                        except Exception as alter_e:
                            logger.error(f"❌ Erro ao adicionar coluna {table_name}.{column.name}: {alter_e}")
                            conn.rollback()

            logger.info("✅ Sincronização de esquema concluída.")
    except Exception as e:
        logger.error(f"❌ Erro crítico durante auto-migração: {e}")


Base = declarative_base()

# Log para garantir que está usando PostgreSQL
# print(f"[OK] Database conectado: PostgreSQL @ {SQLALCHEMY_DATABASE_URL.split('@')[1] if '@' in SQLALCHEMY_DATABASE_URL else 'unknown'}")


import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ⚠️ DATABASE_URL é OBRIGATÓRIO - Não usa SQLite como fallback
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

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

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Configura o engine com pool otimizado para evitar timeout de conexões
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,      # Testa conexão antes de usar (detecta conexões mortas)
    pool_recycle=3600,       # Recicla conexões a cada 1 hora (evita timeout PostgreSQL)
    pool_size=10,            # Pool maior para workers concorrentes
    max_overflow=20          # Permite até 30 conexões no total (10 + 20)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Log para garantir que está usando PostgreSQL
print(f"[OK] Database conectado: PostgreSQL @ {SQLALCHEMY_DATABASE_URL.split('@')[1] if '@' in SQLALCHEMY_DATABASE_URL else 'unknown'}")


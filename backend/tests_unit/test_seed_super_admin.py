import pytest
import os
import sys
from unittest.mock import patch, AsyncMock

# Configurar caminhos para importar os módulos locais
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Forçar uso do SQLite em memória
os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User
from core.security import get_password_hash, verify_password

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    # Limpar a tabela antes de cada teste
    session.query(User).delete()
    session.commit()
    yield session
    session.close()


@pytest.mark.asyncio
async def test_seed_super_admin_creates_new(db):
    """Valida se um novo super admin é criado quando não existe no banco."""
    email = "admin_novo@test.com"
    password = "senha_segura_123"
    
    with patch("os.getenv") as mock_getenv, \
         patch("database.SessionLocal", return_value=db):
        
        def getenv_side_effect(key, default=None):
            if key == "SUPER_ADMIN_EMAIL":
                return email
            if key == "SUPER_ADMIN_PASSWORD":
                return password
            return os.environ.get(key, default)
            
        mock_getenv.side_effect = getenv_side_effect
        
        from main import seed_super_admin
        await seed_super_admin()
        
        # Verificar se foi criado
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.role == "super_admin"
        assert user.is_active is True
        assert verify_password(password, user.hashed_password)


@pytest.mark.asyncio
async def test_seed_super_admin_deletes_others(db):
    """Valida se outros super admins com emails diferentes são excluídos."""
    email_atual = "admin_atual@test.com"
    password_atual = "senha123"
    
    # Criar um super admin antigo/outro no banco de dados
    outro_admin = User(
        email="admin_antigo@test.com",
        hashed_password=get_password_hash("senha_antiga"),
        role="super_admin",
        full_name="Admin Antigo",
        is_active=True
    )
    db.add(outro_admin)
    db.commit()
    
    # Validar que o antigo está lá antes do seed
    assert db.query(User).filter(User.email == "admin_antigo@test.com").first() is not None
    
    with patch("os.getenv") as mock_getenv, \
         patch("database.SessionLocal", return_value=db):
        
        def getenv_side_effect(key, default=None):
            if key == "SUPER_ADMIN_EMAIL":
                return email_atual
            if key == "SUPER_ADMIN_PASSWORD":
                return password_atual
            return os.environ.get(key, default)
            
        mock_getenv.side_effect = getenv_side_effect
        
        from main import seed_super_admin
        await seed_super_admin()
        
        # Verificar se o novo foi criado
        novo_user = db.query(User).filter(User.email == email_atual).first()
        assert novo_user is not None
        assert novo_user.role == "super_admin"
        
        # Verificar se o antigo foi excluído
        antigo_user = db.query(User).filter(User.email == "admin_antigo@test.com").first()
        assert antigo_user is None

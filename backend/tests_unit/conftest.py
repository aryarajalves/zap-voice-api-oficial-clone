import os
import sys
import sqlite3
import uuid

# Registra adaptador do UUID para o SQLite de forma global nos testes
sqlite3.register_adapter(uuid.UUID, lambda u: str(u))

# Define DATABASE_URL ANTES de qualquer import do projeto para evitar o ValueError no database.py
# Usa in-memory para evitar disk I/O errors em ambientes com disco cheio
os.environ["DATABASE_URL"] = "sqlite://"
# Força a desativação da simulação de mensagens durante os testes unitários
# para que a lógica real de envio, pós-envio e controle de fluxo seja testada.
os.environ["SIMULATE_MESSAGING"] = "false"
os.environ["SIMULATE_CHATWOOT_RATELIMIT"] = "false"
# Define SECRET_KEY para os testes unitários passarem sem depender do arquivo .env
os.environ["SECRET_KEY"] = "super-secret-key-for-testing-purposes-only-32-chars-long"

# Adiciona o diretório backend ao path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import models.project # IMPORTANTE: Registrar tabela projects antes de instanciar Base
import pytest
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

import database
from database import Base
import models
import models.project
from core.deps import get_db

# SQLite in-memory compartilhado entre conexões via StaticPool
TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_active_test_session = None

class TestSessionWrapper:
    def __init__(self, session):
        self._session = session
        
    def __getattr__(self, name):
        return getattr(self._session, name)
        
    def close(self):
        # Ignora close para não fechar a sessão do teste no finally do handler
        pass
        
    def commit(self):
        # Executa commit na sessão real
        self._session.commit()

class SessionProxy:
    def __call__(self, *args, **kwargs):
        global _active_test_session
        if _active_test_session is not None:
            return TestSessionWrapper(_active_test_session)
        return TestingSessionLocal(*args, **kwargs)

# Redireciona a SessionLocal e a engine do projeto para a nossa SessionLocal e engine de teste
database.engine = engine
database.SessionLocal = SessionProxy()

from main import app

@pytest.fixture(scope="session", autouse=True)
def mock_rabbitmq_session():
    """Mocka o singleton rabbitmq para toda a sessão de testes — evita conexão real."""
    from unittest.mock import AsyncMock, patch
    from rabbitmq_client import rabbitmq
    with patch.object(rabbitmq, "connect", new_callable=AsyncMock), \
         patch.object(rabbitmq, "consume", new_callable=AsyncMock), \
         patch.object(rabbitmq, "subscribe_events", new_callable=AsyncMock), \
         patch.object(rabbitmq, "publish", new_callable=AsyncMock), \
         patch.object(rabbitmq, "publish_event", new_callable=AsyncMock):
        yield


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    global _active_test_session
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    _active_test_session = session

    yield session

    _active_test_session = None
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    from fastapi.testclient import TestClient
    from unittest.mock import AsyncMock, patch
    from rabbitmq_client import rabbitmq

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Mocka o singleton rabbitmq para não bloquear na conexão durante testes
    with patch.object(rabbitmq, "connect", new_callable=AsyncMock), \
         patch.object(rabbitmq, "consume", new_callable=AsyncMock), \
         patch.object(rabbitmq, "subscribe_events", new_callable=AsyncMock):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()

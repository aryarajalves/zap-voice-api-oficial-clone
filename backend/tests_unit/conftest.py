import os
import sys

# Define DATABASE_URL ANTES de qualquer import do projeto para evitar o ValueError no database.py
# Usa in-memory para evitar disk I/O errors em ambientes com disco cheio
os.environ["DATABASE_URL"] = "sqlite://"

# Adiciona o diretório backend ao path
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.append(backend_path)

import pytest
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from database import Base
from core.deps import get_db
from main import app

# SQLite in-memory compartilhado entre conexões via StaticPool
TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

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

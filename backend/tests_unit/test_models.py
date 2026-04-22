import pytest
import os
import sys

# Ajusta PATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from database import Base
from models import Client, User, Funnel

# Setup banco local
engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()

def test_create_client(db_session):
    client = Client(name="Test Client")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    
    assert client.id is not None
    assert client.name == "Test Client"

def test_create_user(db_session):
    client = Client(name="User Owner Client")
    db_session.add(client)
    db_session.commit()
    
    user = User(
        email="test@user.com",
        hashed_password="hashed_password",
        full_name="Test User",
        client_id=client.id
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    assert user.id is not None
    assert user.email == "test@user.com"
    assert user.client_id == client.id

def test_create_funnel(db_session):
    client = Client(name="Funnel Client")
    db_session.add(client)
    db_session.commit()
    
    funnel = Funnel(
        name="Test Funnel",
        client_id=client.id,
        steps=[{"type": "message", "content": "Hello"}]
    )
    db_session.add(funnel)
    db_session.commit()
    db_session.refresh(funnel)
    
    assert funnel.id is not None
    assert funnel.steps[0]["content"] == "Hello"

def test_create_global_variable(db_session):
    client = Client(name="Global Var Client")
    db_session.add(client)
    db_session.commit()
    
    from models import GlobalVariable
    var = GlobalVariable(
        client_id=client.id,
        name="test_var",
        value="test_value"
    )
    db_session.add(var)
    db_session.commit()
    db_session.refresh(var)
    
    assert var.id is not None
    assert var.name == "test_var"
    assert var.value == "test_value"


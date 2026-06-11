import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.triggers_service import start_now_trigger_logic

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client_obj(db):
    c = models.Client(name="HeartbeatTestClient")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.mark.asyncio
@patch("rabbitmq_client.rabbitmq.publish", new_callable=AsyncMock)
@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
async def test_start_now_with_active_heartbeat(mock_publish_event, mock_publish, db, client_obj):
    # Active heartbeat: current time minus 10 seconds
    hb_time = (datetime.utcnow() - timedelta(seconds=10)).isoformat()
    
    t = models.ScheduledTrigger(
        client_id=client_obj.id,
        status="paused",
        is_bulk=True,
        contacts_list=[{"phone": "123"}],
        processed_data={"last_heartbeat": hb_time}
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    result = await start_now_trigger_logic(t.id, db)
    
    # Assert result structure/status
    assert result["status"] == "success"
    assert "worker ativo" in result["message"]

    # Refresh from db
    db.refresh(t)
    assert t.status == "processing"
    
    # Check that rabbitmq.publish (queue) was NOT called
    mock_publish.assert_not_called()
    
    # Check that rabbitmq.publish_event (for state sync) WAS called to update the frontend
    mock_publish_event.assert_called_once()
    assert mock_publish_event.call_args[0][0] == "trigger_updated"

@pytest.mark.asyncio
@patch("rabbitmq_client.rabbitmq.publish", new_callable=AsyncMock)
@patch("rabbitmq_client.rabbitmq.publish_event", new_callable=AsyncMock)
async def test_start_now_with_stale_heartbeat(mock_publish_event, mock_publish, db, client_obj):
    # Stale heartbeat: current time minus 45 seconds (exceeds 30s threshold)
    hb_time = (datetime.utcnow() - timedelta(seconds=45)).isoformat()
    
    t = models.ScheduledTrigger(
        client_id=client_obj.id,
        status="paused",
        is_bulk=True,
        contacts_list=[{"phone": "123"}],
        processed_data={"last_heartbeat": hb_time}
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    result = await start_now_trigger_logic(t.id, db)
    
    assert result["status"] == "success"
    assert "iniciado com sucesso" in result["message"]

    db.refresh(t)
    assert t.status == "queued"
    
    # Check that rabbitmq.publish (queue) WAS called since worker was stale
    mock_publish.assert_called_once()
    assert mock_publish.call_args[0][0] == "zapvoice_bulk_sends"

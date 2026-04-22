import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import uuid
from datetime import datetime, timedelta
from database import Base

# Setup SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_integrations_list_sorting():
    """
    Test that webhook integrations are returned in a stable order (by created_at asc).
    """
    # Create tables in SQLite
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        test_client_id = 1
        now = datetime.now()
        
        # Integration A (Added first, but we'll set created_at older)
        int_a = models.WebhookIntegration(
            id=uuid.uuid4(),
            name="Alpha Integration",
            platform="hotmart",
            client_id=test_client_id,
            created_at=now - timedelta(days=2)
        )
        
        # Integration B (Added second, newer)
        int_b = models.WebhookIntegration(
            id=uuid.uuid4(),
            name="Beta Integration",
            platform="eduzz",
            client_id=test_client_id,
            created_at=now - timedelta(days=1)
        )
        
        db.add(int_a)
        db.add(int_b)
        db.commit()
        
        # Test the sorting logic
        integrations = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.client_id == test_client_id
        ).order_by(models.WebhookIntegration.created_at.asc()).all()
        
        assert len(integrations) == 2
        assert integrations[0].name == "Alpha Integration"
        assert integrations[1].name == "Beta Integration"
        
        # Test reverse order check
        integrations_desc = db.query(models.WebhookIntegration).filter(
            models.WebhookIntegration.client_id == test_client_id
        ).order_by(models.WebhookIntegration.created_at.desc()).all()
        
        assert integrations_desc[0].name == "Beta Integration"
        assert integrations_desc[1].name == "Alpha Integration"
        
        print("Success: Webhook integrations are sorted correctly by created_at")
        
    finally:
        db.close()
        # Clean up
        import os
        if os.path.exists("./test_temp.db"):
            os.remove("./test_temp.db")

if __name__ == "__main__":
    test_integrations_list_sorting()

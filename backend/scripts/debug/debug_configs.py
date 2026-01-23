
import logging
import sys
from sqlalchemy import select
from models import AppConfig

# Setup basics
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback path if needed
sys.path.append('/app')

try:
    from database import SessionLocal
except ImportError as e:
    logger.error(f"Import failed: {e}")
    sys.exit(1)

def list_configs():
    db = SessionLocal()
    try:
        configs = db.query(AppConfig).all()
        print(f"Total configs: {len(configs)}")
        for c in configs:
            print(f"Client: {c.client_id} | Key: {c.key} | Value: {c.value[:20] if c.value else 'None'}")
    finally:
        db.close()

if __name__ == "__main__":
    list_configs()

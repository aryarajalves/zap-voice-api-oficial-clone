
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, WebhookIntegration, WebhookEventMapping

engine = create_engine("sqlite:///database.db")
Session = sessionmaker(bind=engine)
db = Session()

integration_id = "40cef9fa-6904-4c83-9a92-28108f5337a6"
uuid_obj = uuid.UUID(integration_id)

integration = db.query(WebhookIntegration).filter(WebhookIntegration.id == uuid_obj).first()
if not integration:
    print("Integration not found")
else:
    print(f"Integration: {integration.name}")
    for m in integration.mappings:
        print(f"  Event: {m.event_type}")
        print(f"  Chatwoot Label: {m.chatwoot_label} (Type: {type(m.chatwoot_label)})")
db.close()

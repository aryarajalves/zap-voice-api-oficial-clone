import json
from database import SessionLocal
from models import MessageStatus

db = SessionLocal()
msgs = db.query(MessageStatus).filter_by(message_id='HBgMNTU4NTk2MTIzNTg2FQIAERgSNEE5MDQ5NENBNkE5NzJBNDlDAA==').all()
for m in msgs:
    print(f"[{m.phone_number}] Status: {m.status} | Fail Reason: {m.failure_reason}")

# Let's also check if there is any webhook received recently for this
print("\nRecent Webhooks:")
# We don't have a specific table for whatsapp delivery webhooks, they just update MessageStatus.
# So if it's still 'sent', no webhook updated it to 'delivered'.
db.close()

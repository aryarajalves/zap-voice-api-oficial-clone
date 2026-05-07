from database import SessionLocal
from models import ScheduledTrigger, MessageStatus

db = SessionLocal()
t = db.query(ScheduledTrigger).filter(ScheduledTrigger.template_name == 'mensagem_teste_02').order_by(ScheduledTrigger.id.desc()).first()
if t:
    print('TRIGGER ID:', t.id)
    print('Total Sent:', t.total_sent, 'Delivered:', t.total_delivered, 'Failed:', t.total_failed)
    print('Contacts:', t.contacts_list)
    msgs = db.query(MessageStatus).filter_by(trigger_id=t.id).all()
    for m in msgs:
        print(f"[{m.phone_number}] Status: {m.status} | MsgID: {m.message_id} | Fail Reason: {m.failure_reason} | Type: {m.message_type}")
else:
    print("Not found")
db.close()

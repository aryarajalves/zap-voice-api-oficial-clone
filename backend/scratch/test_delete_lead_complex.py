import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models
from routers.leads import _delete_lead_and_relations

db = SessionLocal()
try:
    lead_id = 157129
    lead = db.query(models.WebhookLead).filter(models.WebhookLead.id == lead_id).first()
    if not lead:
        print(f"Lead {lead_id} não encontrado no banco.")
    else:
        print(f"Tentando deletar Lead ID {lead_id} ({lead.name}) via _delete_lead_and_relations...")
        _delete_lead_and_relations(db, lead, lead.client_id)
        db.commit()
        print("Sucesso! Lead deletado sem erros.")
except Exception as e:
    print(f"ERRO AO DELETAR LEAD:")
    import traceback
    traceback.print_exc()
finally:
    db.close()

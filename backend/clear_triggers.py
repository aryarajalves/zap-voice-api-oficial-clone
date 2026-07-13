import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

db = SessionLocal()
try:
    phone = "5585996123586"
    phone_suffix = "96123586"
    
    # Buscar triggers suspensas para este telefone
    triggers = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.status == "suspended",
        (models.ScheduledTrigger.contact_phone == phone) | 
        (models.ScheduledTrigger.contact_phone.like(f"%{phone_suffix}"))
    ).all()
    
    print(f"Abortando {len(triggers)} triggers suspensas para o telefone {phone}...")
    for t in triggers:
        t.status = "aborted"
        print(f"  Trigger ID {t.id} (Funil ID {t.funnel_id}) atualizada para status 'aborted'")
        
    db.commit()
    print("Sucesso!")
finally:
    db.close()

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

db = SessionLocal()
try:
    # Contar por cliente e status
    from sqlalchemy import func
    counts = db.query(models.ScheduledTrigger.client_id, models.ScheduledTrigger.status, func.count(models.ScheduledTrigger.id))\
        .group_by(models.ScheduledTrigger.client_id, models.ScheduledTrigger.status).all()
    print("Resumo de triggers no banco:")
    for cid, status, qty in counts:
        print(f"  Cliente: {cid} | Status: {status} | Quantidade: {qty}")
        
    print("\nTriggers suspensas do Cliente 12:")
    triggers_12 = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id == 12,
        models.ScheduledTrigger.status == "suspended"
    ).all()
    for t in triggers_12:
        funnel_name = t.funnel.name if t.funnel else "Nenhum (Funil Deletado/Orfão)"
        print(f"  ID: {t.id} | Telefone: {t.contact_phone} | Funil: ID {t.funnel_id} ({funnel_name}) | Nó: {t.current_node_id}")
        
    print("\nTriggers suspensas de outros clientes (limite de 10):")
    triggers_others = db.query(models.ScheduledTrigger).filter(
        models.ScheduledTrigger.client_id != 12,
        models.ScheduledTrigger.status == "suspended"
    ).limit(10).all()
    for t in triggers_others:
        funnel_name = t.funnel.name if t.funnel else "Nenhum (Funil Deletado/Orfão)"
        print(f"  Cliente: {t.client_id} | ID: {t.id} | Telefone: {t.contact_phone} | Funil: ID {t.funnel_id} ({funnel_name}) | Nó: {t.current_node_id}")

finally:
    db.close()
